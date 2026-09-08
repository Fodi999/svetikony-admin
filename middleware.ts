import { NextResponse, type NextRequest } from "next/server";
import { readSessionCookie } from "@/lib/auth/cookie";

/**
 * Basic Auth gate below: kept as outer defense-in-depth during the Phase
 * 1A/1B migration to real per-user auth (see the Phase 1B design report —
 * deliberate choice B, not permanent; removal is its own separate,
 * explicit decision once real auth has been verified in production for a
 * while). Fails closed — if GATE_USERNAME/GATE_PASSWORD aren't configured,
 * every request this gate is actually applied to is rejected rather than
 * silently opening, same convention as every other secret in this project
 * (see svet-ikony's TELEGRAM_WEBHOOK_SECRET/AUTOPOST_TICK_SECRET).
 *
 * PHASE 3C: no longer checked unconditionally for every request. Telegram
 * passwordless login opens /telegram-login in whatever browser Telegram
 * itself launches (not necessarily the browser that already satisfied
 * Basic Auth) — a bare HTTP 401 there before any ticket exchange could
 * happen defeats the entire "no password, no second login" point of
 * Phase 3. See applyBasicAuthGate's own call site below for the exact
 * bypass conditions.
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

function applyBasicAuthGate(request: NextRequest): NextResponse | null {
  const expectedUser = process.env.GATE_USERNAME;
  const expectedPassword = process.env.GATE_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    return unauthorized();
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));
  if (!credentials || credentials.user !== expectedUser || credentials.password !== expectedPassword) {
    return unauthorized();
  }

  return null;
}

/** Route-group pages that must stay reachable without a session cookie —
 * you need to be able to reach /login before you have one, /no-access
 * is the (currently unlinked, reserved for future use) landing for an
 * authenticated-but-insufficiently-permissioned visitor, and /telegram-login
 * (Phase 3) is the pre-auth landing a Telegram button opens: the browser
 * has no session cookie yet at that point either -- that page's own JS is
 * what exchanges the ticket for one. */
const PUBLIC_PAGE_PATHS = new Set(["/login", "/no-access", "/telegram-login"]);

/**
 * PHASE 3C: the two routes a Telegram login MUST reach before any
 * admin_session cookie can exist -- the landing page itself, and the BFF
 * endpoint that creates the cookie. Deliberately a closed, explicit list
 * (not a prefix match on /api/bff/auth/** or /api/**) -- every other BFF
 * auth route (login, logout, session) already has its own real 401/403
 * behavior and does not need to bypass Basic Auth to function correctly;
 * broadening this would trade a real (if shallow) defense-in-depth layer
 * for no actual benefit. Confirmed directly (not assumed) that
 * /api/bff/auth/session being Basic-Auth-blocked during /telegram-login's
 * own AuthProvider mount does NOT break that page: getSession() (lib/api/
 * http/auth.ts) treats any non-JSON/non-"session_expired" 401 as "no
 * session" and resolves to null rather than throwing, and the Telegram
 * login page never reads status/user from context in the first place --
 * so no exception was added for it.
 */
const TELEGRAM_PRE_AUTH_PATHS = new Set(["/telegram-login", "/api/bff/auth/telegram/exchange"]);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isTelegramPreAuth = TELEGRAM_PRE_AUTH_PATHS.has(pathname);

  /**
   * Cookie *presence* only, never validity -- real authorization remains
   * entirely at the BFF/backend layer (app/api/bff/_lib/auth.ts's
   * withAuth(), resolving the session against svet-ikony on every
   * request). This value is used for two independent, deliberately
   * shallow decisions below: whether to skip the legacy Basic Auth gate,
   * and (unchanged from before Phase 3C) whether to redirect a protected
   * page to /login. Neither treats "a cookie exists" as "the visitor is
   * authenticated" -- a garbage/expired cookie value passes both of these
   * checks and still gets correctly rejected by the real session check
   * downstream, exactly as it already did before this change.
   */
  const hasAdminSessionCookie = Boolean(readSessionCookie(request));

  // Skip the legacy Basic Auth gate for: the two Telegram pre-auth routes
  // (unconditionally -- there is no cookie yet by definition), and any
  // request that already carries an admin_session cookie (a real Telegram
  // or password login already happened in this browser; re-challenging
  // Basic Auth on top of that would just break the "no second login"
  // guarantee for no security benefit the real session check doesn't
  // already provide).
  if (!isTelegramPreAuth && !hasAdminSessionCookie) {
    const gateResponse = applyBasicAuthGate(request);
    if (gateResponse) return gateResponse;
  }

  /**
   * Cheap UX redirect only — same as before Phase 3C, unchanged. Never
   * applied to /api/** — /api/bff/auth/login must stay reachable before
   * any cookie exists, and every other /api/** route already rejects a
   * missing/invalid session with its own real 401.
   */
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicPage = PUBLIC_PAGE_PATHS.has(pathname);
  if (!isApiRoute && !isPublicPage && !hasAdminSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
