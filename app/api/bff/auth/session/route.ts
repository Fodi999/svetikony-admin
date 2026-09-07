import { NextResponse, type NextRequest } from "next/server";
import { readSessionCookie } from "@/lib/auth/cookie";
import { resolveSession } from "../../_lib/auth";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

/**
 * GET /api/bff/auth/session -- how the client restores auth state after a
 * hard refresh, a new tab, or any full page load: browser JS cannot read
 * an HttpOnly cookie, so this is the only way it learns whether it's still
 * authenticated. Distinguishes "no cookie at all" (details: "no_session",
 * -> AuthProvider shows a plain login form) from "a cookie was presented
 * but is no longer valid" (details: "session_expired", -> AuthProvider
 * shows the "please log in again" messaging) -- this distinction is safe
 * to expose to the browser here (unlike login's identical-response-for-
 * every-failure rule) because the caller already holds the cookie in
 * question; there is no cross-account enumeration risk in telling it why
 * its own session is gone.
 */
export async function GET(request: NextRequest) {
  const rawToken = readSessionCookie(request);
  if (!rawToken) {
    return NextResponse.json(
      { code: "AUTHENTICATION_ERROR", message: "Authentication failed", details: "no_session" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const result = await resolveSession(rawToken);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message, details: "session_expired" },
      { status: result.status, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json({ user: result.user, expiresAt: result.expiresAt }, { headers: NO_STORE_HEADERS });
}
