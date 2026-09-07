import type { NextRequest } from "next/server";
import { createAbortTimeout, isAbortError } from "@/lib/api/http/timeout";
import type { PermissionArea } from "@/lib/auth/permissions";

/**
 * Phase 1D.1 — persists one admin_audit_log row (via svet-ikony's
 * POST /api/admin/audit) for every withAuth()-protected mutation, after it
 * actually ran. Deliberately its own module, imported only by
 * app/api/bff/_lib/auth.ts's withAuth() — never called per-route, so
 * coverage is automatic for anything already going through withAuth
 * (proven structurally by app/api/bff/_lib/route-manifest.test.ts).
 */

const REQUEST_TIMEOUT_MS = 10_000;
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

/** Semantic verb for the audit row's `action` field, distinct from the raw
 * `method` field (also recorded) — matches the login/logout precedent in
 * svet-ikony's own auth routes, which use "login"/"logout", not "POST". */
function actionForMethod(method: string): string {
  switch (method.toUpperCase()) {
    case "POST":
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return method.toLowerCase();
  }
}

/**
 * Best-effort entity extraction — deliberately simple, not a route-by-route
 * parser (see the Phase 1D.1 report's own tradeoff note): `entityType` is
 * the first path segment after /api/bff/ (always well-defined for every
 * route); `entityId` is `params.id` when the dynamic route context
 * supplies one (e.g. prayers/[id], products/[id]), else left absent.
 * Action routes whose dynamic segments aren't literally named `id` (e.g.
 * telegram's [date]/[type] slot actions) get no entityId — nullable is the
 * documented, accepted outcome for those, not a bug.
 */
async function extractEntity(request: NextRequest, args: unknown[]): Promise<{ entityType?: string; entityId?: string }> {
  const segments = request.nextUrl.pathname.replace(/^\/api\/bff\//, "").split("/").filter(Boolean);
  const entityType = segments[0];

  const context = args[0] as { params?: Promise<Record<string, string>> } | undefined;
  if (context?.params) {
    try {
      const resolved = await context.params;
      if (typeof resolved.id === "string" && resolved.id) {
        return { entityType, entityId: resolved.id };
      }
    } catch {
      // params rejected — fall through with no entityId, not a hard failure.
    }
  }
  return { entityType };
}

export type MutationOutcome = { success: boolean; statusCode?: number };

/**
 * Calls svet-ikony's POST /api/admin/audit with the same service
 * credential + human session token withAuth() already resolved for this
 * request. The actor (user_id/role) is derived server-side there from the
 * session, never from anything in this call's body — this function's body
 * only ever carries WHAT happened, never WHO.
 *
 * NEVER throws. Any failure — network error, timeout, non-2xx from the
 * audit endpoint — is caught and logged server-side only (console.error).
 * A failed audit write must never change a successful mutation into an
 * error response for the end user — see the Phase 1D.1 report's
 * "AUDIT-FAILURE SEMANTICS" section for the full reasoning.
 */
export async function recordMutationAudit(params: {
  rawToken: string;
  area: PermissionArea;
  request: NextRequest;
  args: unknown[];
  outcome: MutationOutcome;
  requestId: string;
}): Promise<void> {
  const baseUrl = process.env.SVET_IKONY_API_BASE_URL;
  const serviceToken = process.env.SVET_IKONY_ADMIN_TOKEN;
  if (!baseUrl || !serviceToken) {
    console.error(`[audit] cannot record mutation audit: upstream not configured (requestId=${params.requestId})`);
    return;
  }

  const method = params.request.method.toUpperCase();
  let entity: { entityType?: string; entityId?: string };
  try {
    entity = await extractEntity(params.request, params.args);
  } catch {
    entity = {};
  }

  const body = {
    action: actionForMethod(method),
    area: params.area,
    method,
    path: params.request.nextUrl.pathname,
    entityType: entity.entityType,
    entityId: entity.entityId,
    success: params.outcome.success,
    statusCode: params.outcome.statusCode,
    requestId: params.requestId,
  };

  const url = new URL("/api/admin/audit", baseUrl);
  const { signal, clear } = createAbortTimeout(REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "X-Admin-Session": params.rawToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      console.error(`[audit] upstream rejected audit write: HTTP ${response.status} (requestId=${params.requestId})`);
    }
  } catch (error) {
    const reason = isAbortError(error) ? "timed out" : error instanceof Error ? error.message : "unknown error";
    console.error(`[audit] failed to record mutation audit (requestId=${params.requestId}): ${reason}`);
  } finally {
    clear();
  }
}
