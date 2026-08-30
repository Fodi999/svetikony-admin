import { NextResponse, type NextRequest } from "next/server";

/**
 * TEMPORARY STOPGAP — remove once real per-user authentication ships.
 *
 * ApiClient.auth is still the Stage-1 mock (lib/api/mock/auth.ts):
 * hardcoded plaintext credentials shipped in the JS bundle, "session" is a
 * client-side sessionStorage flag only. No /api/bff/** route checks a
 * session server-side (they only hold the upstream SVET_IKONY_ADMIN_TOKEN,
 * which authenticates this app *to the Worker*, not a browser *to this
 * app*). Without this gate, the entire admin surface — content CRUD,
 * Telegram audience PII, and critically the autopost on/off and publish
 * endpoints — is reachable by anyone on the internet with zero credentials.
 *
 * Deliberately crude: one shared HTTP Basic Auth credential for the whole
 * app, checked in front of every request (pages and API alike). Fails
 * closed — if GATE_USERNAME/GATE_PASSWORD aren't configured, every request
 * is rejected rather than the gate silently opening, same convention as
 * every other secret in this project (see svet-ikony's
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
