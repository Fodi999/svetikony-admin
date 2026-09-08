import { NextResponse, type NextRequest } from "next/server";
import { createAbortTimeout, isAbortError } from "@/lib/api/http/timeout";
import { setSessionCookie } from "@/lib/auth/cookie";
import { isCrossSiteMutation } from "../../../_lib/auth";

const REQUEST_TIMEOUT_MS = 10_000;
const NO_STORE_HEADERS = { "cache-control": "no-store" };

type UpstreamExchangeResponse = {
  token: string;
  user: { id: string; name: string; email: string; role: string };
  expiresAt: string;
};

function jsonError(status: number, code: string, message: string, details?: string) {
  return NextResponse.json({ code, message, ...(details ? { details } : {}) }, { status, headers: NO_STORE_HEADERS });
}

/**
 * POST /api/bff/auth/telegram/exchange -- Phase 3. Mirrors
 * app/api/bff/auth/login/route.ts exactly: calls svet-ikony's
 * service-protected /api/admin/auth/telegram/exchange with the existing
 * server-only SVET_IKONY_ADMIN_TOKEN, then converts the upstream's raw
 * opaque session token into the SAME HttpOnly cookie setSessionCookie()
 * already uses for password login -- no parallel session architecture, no
 * special-cased cookie logic for this path. The raw ticket (from the
 * browser's /telegram-login page, itself read from the URL fragment) and
 * the raw session token both pass through this route but never appear in
 * its own JSON response body.
 */
export async function POST(request: NextRequest) {
  if (isCrossSiteMutation(request)) {
    return jsonError(403, "AUTHORIZATION_ERROR", "Authorization failed", "Cross-site request rejected");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "VALIDATION_ERROR", "Validation failed", "Request body must be JSON");
  }
  const { ticket } = (body as { ticket?: unknown } | null) ?? {};
  if (typeof ticket !== "string" || !ticket) {
    return jsonError(400, "VALIDATION_ERROR", "Validation failed", "ticket is required");
  }

  const baseUrl = process.env.SVET_IKONY_API_BASE_URL;
  const serviceToken = process.env.SVET_IKONY_ADMIN_TOKEN;
  if (!baseUrl || !serviceToken) {
    return jsonError(401, "AUTHENTICATION_ERROR", "Authentication failed", "Upstream is not configured");
  }

  const url = new URL("/api/admin/auth/telegram/exchange", baseUrl);
  const { signal, clear } = createAbortTimeout(REQUEST_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceToken}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ticket }),
      signal,
    });
  } catch (error) {
    return jsonError(
      502,
      "NETWORK_ERROR",
      "Network error",
      isAbortError(error) ? "Upstream request timed out" : "Network error contacting upstream API",
    );
  } finally {
    clear();
  }

  const bodyText = await upstream.text();

  if (!upstream.ok) {
    // Relay the upstream's own generic auth-failure envelope unchanged --
    // "Invalid or expired login ticket" for every rejection reason, same
    // never-distinguish-the-cause principle as the password login route.
    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: { "content-type": "application/json", ...NO_STORE_HEADERS },
    });
  }

  let parsed: UpstreamExchangeResponse;
  try {
    parsed = JSON.parse(bodyText) as UpstreamExchangeResponse;
  } catch {
    return jsonError(502, "INTERNAL_ERROR", "Internal server error", "Invalid upstream response");
  }

  const response = NextResponse.json({ user: parsed.user, expiresAt: parsed.expiresAt }, { headers: NO_STORE_HEADERS });
  setSessionCookie(response, parsed.token, parsed.expiresAt);
  return response;
}
