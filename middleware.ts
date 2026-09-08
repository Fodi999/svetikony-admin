import { NextResponse, type NextRequest } from "next/server";
import { readSessionCookie } from "@/lib/auth/cookie";

/**
 * Basic Auth gate below: kept as outer defense-in-depth during the Phase
 * 1A/1B migration to real per-user auth (see the Phase 1B design report —
 * deliberate choice B, not permanent; removal is its own separate,
 * explicit decision once real auth has been verified in production for a
 * while). One shared HTTP Basic Auth credential for the whole app, checked
 * in front of every request (pages and API alike). Fails closed — if
 * GATE_USERNAME/GATE_PASSWORD aren't configured, every request is rejected
 * rather than the gate silently opening, same convention as every other
 * secret in this project (see svet-ikony's
 * TELEGRAM_WEBHOOK_SECRET/AUTOPOST_TICK_SECRET).
 */
function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="svetikony-admin"' },
  });
}

function parseBasicAuth(header: string | null): { user: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  let decoded: string;
  try {
    decoded = atob(header.slice("Basic ".length));
  } catch {
    return null;
  }
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return { user: decoded, password: "" };
  return { user: decoded.slice(0, separatorIndex), password: decoded.slice(separatorIndex + 1) };
}

/** Route-group pages that must stay reachable without a session cookie —
 * you need to be able to reach /login before you have one, /no-access
 * is the (currently unlinked, reserved for future use) landing for an
 * authenticated-but-insufficiently-permissioned visitor, and /telegram-login
 * (Phase 3) is the pre-auth landing a Telegram button opens: the browser
 * has no session cookie yet at that point either -- that page's own JS is
 * what exchanges the ticket for one. */
const PUBLIC_PAGE_PATHS = new Set(["/login", "/no-access", "/telegram-login"]);

export function middleware(request: NextRequest): NextResponse {
  const expectedUser = process.env.GATE_USERNAME;
  const expectedPassword = process.env.GATE_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    return unauthorized();
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));
  if (!credentials || credentials.user !== expectedUser || credentials.password !== expectedPassword) {
    return unauthorized();
  }

  const { pathname } = request.nextUrl;

  /**
   * Cheap UX redirect only — checks cookie *presence*, never validity. Real
   * security lives entirely at the BFF route level (app/api/bff/_lib/auth.ts's
   * withAuth, resolving the session against svet-ikony on every request),
   * not here. Deliberately never applied to /api/** — /api/bff/auth/login
   * must stay reachable before any cookie exists, and every other /api/**
   * route already rejects a missing/invalid session with its own real 401;
   * a cookie-presence check here would be redundant at best and, if ever
   * mistaken for the actual auth check, actively misleading.
   */
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicPage = PUBLIC_PAGE_PATHS.has(pathname);
  if (!isApiRoute && !isPublicPage && !readSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
