import type { NextRequest, NextResponse } from "next/server";

/**
 * Single source of truth for the human session cookie's name and
 * attributes (Phase 1B) — every place that sets or clears it goes through
 * here, so the attributes can never drift between the login route and the
 * logout route. HttpOnly always; Secure only in production (a local `npm
 * run dev` over plain http would otherwise silently never receive the
 * cookie back); SameSite=Strict since this is an internal admin tool with
 * no legitimate flow where an authenticated cookie should ever be sent
 * cross-site (no OAuth redirect, no email deep-link, no embed) — see
 * app/api/bff/_lib/auth.ts's CSRF check for the defense-in-depth layered on
 * top of this.
 */
export const ADMIN_SESSION_COOKIE = "admin_session";

const baseAttributes = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

/** Sets the cookie with an expiry aligned exactly to the backend session's
 * own expiresAt — the cookie must never outlive the session it names. */
export function setSessionCookie(response: NextResponse, token: string, expiresAt: string): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, { ...baseAttributes, expires: new Date(expiresAt) });
}

/** Clears the cookie using the exact same Path/SameSite/Secure semantics it
 * was set with -- a mismatched attribute (e.g. a different Path) makes a
 * browser treat "clear" as a completely different cookie and silently no-op. */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...baseAttributes, maxAge: 0 });
}

export function readSessionCookie(request: NextRequest): string | undefined {
  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
}
