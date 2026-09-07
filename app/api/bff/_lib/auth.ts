import type { NextRequest } from "next/server";
import { createAbortTimeout, isAbortError } from "@/lib/api/http/timeout";
import { readSessionCookie } from "@/lib/auth/cookie";
import { accessLevel, type AccessLevel, type PermissionArea } from "@/lib/auth/permissions";
import type { Role } from "@/types/entities";
import { isMutatingMethod, recordMutationAudit } from "./audit";

/**
 * Server-side auth primitive for /api/bff/** routes (Phase 1B). Two
 * responsibilities live here, deliberately kept together: resolving a
 * browser's admin_session cookie to a real user (by asking svet-ikony,
 * never trusting anything client-supplied), and enforcing this admin's one
 * authoritative permission matrix (lib/auth/permissions.ts -- confirmed
 * safe to import here: it's plain functions over a Record literal, no
 * client-only dependency, no "use client" directive).
 *
 * NOT yet wired into the ~50 existing resource routes (Phase 1C) -- this
 * file is the primitive itself, fully unit-tested on its own first.
 */

const REQUEST_TIMEOUT_MS = 10_000;
const NO_STORE_HEADERS = { "cache-control": "no-store" };

export type SafeUser = { id: string; name: string; email: string; role: Role };

function jsonError(status: number, code: string, message: string, details?: string): Response {
  return Response.json({ code, message, ...(details ? { details } : {}) }, { status, headers: NO_STORE_HEADERS });
}

/**
 * Asks svet-ikony's /api/admin/auth/session whether a given opaque token is
 * currently a live session, using the existing server-only service
 * credential (SVET_IKONY_ADMIN_TOKEN) -- exactly the same trust boundary
 * every other BFF route already uses, just with the additional
 * X-Admin-Session header the human-auth layer needs. Never called from
 * client code; this module has no "use client" export.
 */
export async function resolveSession(
  rawToken: string,
): Promise<{ ok: true; user: SafeUser; expiresAt: string } | { ok: false; status: number; code: string; message: string }> {
  const baseUrl = process.env.SVET_IKONY_API_BASE_URL;
  const token = process.env.SVET_IKONY_ADMIN_TOKEN;
  if (!baseUrl || !token) {
    return { ok: false, status: 401, code: "AUTHENTICATION_ERROR", message: "Authentication failed" };
  }

  const url = new URL("/api/admin/auth/session", baseUrl);
  const { signal, clear } = createAbortTimeout(REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "X-Admin-Session": rawToken, Accept: "application/json" },
      signal,
      cache: "no-store",
    });
  } catch (error) {
    return {
      ok: false,
      status: 502,
      code: "NETWORK_ERROR",
      message: isAbortError(error) ? "Upstream request timed out" : "Network error contacting upstream API",
    };
  } finally {
    clear();
  }

  const bodyText = await response.text();
  if (!response.ok) {
    let body: { code?: string; message?: string } = {};
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      // fall through to the generic message below
    }
    return { ok: false, status: response.status, code: body.code ?? "AUTHENTICATION_ERROR", message: body.message ?? "Authentication failed" };
  }

  try {
    const parsed = JSON.parse(bodyText) as { user: SafeUser; expiresAt: string };
    return { ok: true, user: parsed.user, expiresAt: parsed.expiresAt };
  } catch {
    return { ok: false, status: 502, code: "INTERNAL_ERROR", message: "Invalid upstream response" };
  }
}

/**
 * Defense-in-depth CSRF check for mutating requests (POST/PUT/PATCH/DELETE)
 * -- the primary defense is the session cookie's own SameSite=Strict
 * attribute (lib/auth/cookie.ts), which already stops it being sent
 * cross-site by any modern browser. This adds a second, independent check
 * so a gap in one doesn't leave zero protection.
 *
 * Sec-Fetch-Site (sent by all evergreen browsers) is authoritative when
 * present. When absent, falls back to comparing the Origin header against
 * the request's own origin. When BOTH are absent (unusual for a real
 * browser fetch, more likely an older client or a non-browser tool),
 * this does not block -- SameSite=Strict remains the primary defense, and
 * failing closed here on missing-but-unprovable information would be
 * theatre, not protection.
 */
export function isCrossSiteMutation(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return false;

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) return secFetchSite !== "same-origin";

  const origin = request.headers.get("origin");
  if (origin) return origin !== request.nextUrl.origin;

  return false;
}

function csrfRejection(): Response {
  return jsonError(403, "AUTHORIZATION_ERROR", "Authorization failed", "Cross-site request rejected");
}

function hasAccess(role: Role, area: PermissionArea, level: AccessLevel): boolean {
  const granted = accessLevel(role, area);
  if (level === "edit") return granted === "edit";
  return granted === "view" || granted === "edit";
}

type Handler<Args extends unknown[]> = (request: NextRequest, session: { user: SafeUser }, ...args: Args) => Promise<Response> | Response;

/**
 * Wraps a BFF route handler with: CSRF check (mutating methods only) ->
 * session resolution (401 if missing/invalid) -> permission check (403 if
 * insufficient) -> only then the real handler -> (Phase 1D.1, mutating
 * methods only) a best-effort persistent audit record of what actually
 * happened. The handler is never invoked unless both checks pass --
 * verified by tests, not just by reading the code, since this is the one
 * function every future write route's safety will depend on.
 *
 * Audit scope (Phase 1D.1, deliberately narrow): only requests that reach
 * this point — i.e. already authenticated AND authorized — and only for
 * mutating methods (POST/PUT/PATCH/DELETE). A 401/403 rejected above never
 * produces an audit row here (it was never an attempted business mutation
 * — see the Phase 1D.1 report for why "viewer deleted prayer — failed"
 * would be a misleading record of something that was never attempted
 * upstream). GET/HEAD requests are never audited here either.
 *
 * Audit-failure isolation: recordMutationAudit() never throws and never
 * blocks the real response — a failed audit write is logged server-side
 * only. The one case requiring extra care is when `handler` itself throws:
 * a best-effort failure audit is attempted, then the original error is
 * re-thrown unchanged, preserving whatever Next.js/existing error handling
 * already does for an uncaught route handler exception.
 */
export function withAuth<Args extends unknown[] = []>(
  options: { area: PermissionArea; level: AccessLevel },
  handler: Handler<Args>,
) {
  return async (request: NextRequest, ...args: Args): Promise<Response> => {
    if (isCrossSiteMutation(request)) {
      return csrfRejection();
    }

    const rawToken = readSessionCookie(request);
    if (!rawToken) {
      return jsonError(401, "AUTHENTICATION_ERROR", "Authentication failed", "No session cookie");
    }

    const result = await resolveSession(rawToken);
    if (!result.ok) {
      return jsonError(result.status, result.code, result.message);
    }

    if (!hasAccess(result.user.role, options.area, options.level)) {
      return jsonError(403, "AUTHORIZATION_ERROR", "Authorization failed", "Insufficient permissions");
    }

    if (!isMutatingMethod(request.method)) {
      return (await handler(request, { user: result.user }, ...args)) as Response;
    }

    // Mutating method, already authenticated + authorized: audit what
    // actually happens, observed after the fact -- never assumed.
    const requestId = crypto.randomUUID();

    let response: Response;
    try {
      response = (await handler(request, { user: result.user }, ...args)) as Response;
    } catch (error) {
      await recordMutationAudit({
        rawToken,
        area: options.area,
        request,
        args,
        outcome: { success: false },
        requestId,
      });
      throw error; // preserve existing error semantics unchanged
    }

    await recordMutationAudit({
      rawToken,
      area: options.area,
      request,
      args,
      outcome: { success: response.ok, statusCode: response.status },
      requestId,
    });

    // Best-effort correlation header -- lets a server log line, the audit
    // row, and (if the client surfaces it) a bug report all reference the
    // same requestId. Never lets a header-mutation failure affect the
    // response itself (some Response instances have immutable headers).
    try {
      response.headers.set("x-request-id", requestId);
    } catch {
      // ignore -- correlation is a convenience, not a correctness requirement
    }

    return response;
  };
}
