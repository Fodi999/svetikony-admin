import { NextResponse, type NextRequest } from "next/server";
import { createAbortTimeout, isAbortError } from "@/lib/api/http/timeout";
import { setSessionCookie } from "@/lib/auth/cookie";
import { isCrossSiteMutation } from "../../_lib/auth";

const REQUEST_TIMEOUT_MS = 10_000;
const NO_STORE_HEADERS = { "cache-control": "no-store" };

type UpstreamLoginResponse = {
  token: string;
  user: { id: string; name: string; email: string; role: string };
  expiresAt: string;
};

function jsonError(status: number, code: string, message: string, details?: string) {
  return NextResponse.json({ code, message, ...(details ? { details } : {}) }, { status, headers: NO_STORE_HEADERS });
}

/**
 * POST /api/bff/auth/login -- the browser's only way to authenticate.
 * Calls svet-ikony's service-protected /api/admin/auth/login with the
 * existing server-only SVET_IKONY_ADMIN_TOKEN (never sent to the browser),
 * then converts the upstream's raw opaque session token into an HttpOnly
 * cookie -- the token itself never appears in this route's own JSON
 * response body, only `user`/`expiresAt`.
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
  const { email, password } = (body as { email?: unknown; password?: unknown } | null) ?? {};
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    return jsonError(400, "VALIDATION_ERROR", "Validation failed", "email and password are required");
  }

  const baseUrl = process.env.SVET_IKONY_API_BASE_URL;
  const serviceToken = process.env.SVET_IKONY_ADMIN_TOKEN;
  if (!baseUrl || !serviceToken) {
    return jsonError(401, "AUTHENTICATION_ERROR", "Authentication failed", "Upstream is not configured");
  }

  const url = new URL("/api/admin/auth/login", baseUrl);
  const { signal, clear } = createAbortTimeout(REQUEST_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceToken}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
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
    // Relay the upstream's own status/envelope unchanged -- it is already a
    // safe, generic message ("Invalid email or password" for every failure
    // reason), see svet-ikony's Phase 1A login route.
    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: { "content-type": "application/json", ...NO_STORE_HEADERS },
    });
  }

  let parsed: UpstreamLoginResponse;
  try {
    parsed = JSON.parse(bodyText) as UpstreamLoginResponse;
  } catch {
    return jsonError(502, "INTERNAL_ERROR", "Internal server error", "Invalid upstream response");
  }

  const response = NextResponse.json({ user: parsed.user, expiresAt: parsed.expiresAt }, { headers: NO_STORE_HEADERS });
  setSessionCookie(response, parsed.token, parsed.expiresAt);
  return response;
}
