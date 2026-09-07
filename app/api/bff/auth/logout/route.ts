import { NextResponse, type NextRequest } from "next/server";
import { createAbortTimeout } from "@/lib/api/http/timeout";
import { clearSessionCookie, readSessionCookie } from "@/lib/auth/cookie";
import { isCrossSiteMutation } from "../../_lib/auth";

const REQUEST_TIMEOUT_MS = 10_000;
const NO_STORE_HEADERS = { "cache-control": "no-store" };

/**
 * POST /api/bff/auth/logout -- always clears the browser's cookie and
 * always responds 200, even if there was no cookie, the upstream session
 * was already expired/revoked, or the upstream call fails outright. Logout
 * must be safe to call repeatedly (a stale tab, a double click) without
 * ever surfacing an error to the user for something that is, from their
 * point of view, already the desired end state: not logged in.
 */
export async function POST(request: NextRequest) {
  if (isCrossSiteMutation(request)) {
    return NextResponse.json(
      { code: "AUTHORIZATION_ERROR", message: "Authorization failed", details: "Cross-site request rejected" },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  const rawToken = readSessionCookie(request);
  const baseUrl = process.env.SVET_IKONY_API_BASE_URL;
  const serviceToken = process.env.SVET_IKONY_ADMIN_TOKEN;

  if (rawToken && baseUrl && serviceToken) {
    const url = new URL("/api/admin/auth/logout", baseUrl);
    const { signal, clear } = createAbortTimeout(REQUEST_TIMEOUT_MS);
    try {
      await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceToken}`, "X-Admin-Session": rawToken },
        signal,
      });
    } catch {
      // Deliberately swallowed -- see the doc comment above. A network
      // failure talking to the upstream must not stop the browser's own
      // cookie from being cleared; that's the part fully within this
      // route's own control and the part that actually matters to the user.
    } finally {
      clear();
    }
  }

  const response = NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  clearSessionCookie(response);
  return response;
}
