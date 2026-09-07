import { vi } from "vitest";
import type { Role } from "@/types/entities";

/**
 * Shared fixtures for testing withAuth()-wrapped BFF routes (Phase 1C).
 * Not itself a test file -- imported by route.test.ts files and by
 * app/api/bff/_lib/route-manifest.test.ts's own representative
 * integration tests.
 */

export const TEST_SESSION_TOKEN = "test-session-token";

/**
 * Merge a valid admin_session cookie into a request init object. Typed
 * narrower than the DOM `RequestInit` (no `signal`) deliberately: DOM's
 * `RequestInit.signal` is `AbortSignal | null | undefined` while Next's own
 * `NextRequest` constructor expects `AbortSignal | undefined` (no null),
 * and no test here needs `signal` at all -- this narrower shape is
 * structurally compatible with both `Request`'s and `NextRequest`'s init
 * types without fighting that mismatch.
 */
export function withSessionCookie(init: { method?: string; headers?: HeadersInit; body?: BodyInit } = {}): {
  method?: string;
  headers: Headers;
  body?: BodyInit;
} {
  const headers = new Headers(init.headers);
  headers.append("cookie", `admin_session=${TEST_SESSION_TOKEN}`);
  return { ...init, headers };
}

function sessionCheckResponse(role: Role): Response {
  return new Response(
    JSON.stringify({
      user: { id: "test-user-id", name: "Test User", email: "test@svetikony.com", role },
      expiresAt: "2099-01-01T00:00:00.000Z",
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

/** Default stub for withAuth's Phase 1D.1 audit write (POST
 * /api/admin/audit) -- a plain 201, since most tests don't care about the
 * audit call's own request/response, only that it doesn't interfere with
 * counting/asserting on the *resource's* own upstream call. Tests that DO
 * want to inspect the audit call itself should use mockFetchDispatch
 * directly instead of this helper. */
function auditWriteResponse(): Response {
  return new Response(JSON.stringify({ recorded: true }), { status: 201, headers: { "content-type": "application/json" } });
}

/**
 * Standard fetch double for an authenticated BFF route test: any call
 * whose URL contains /api/admin/auth/session (withAuth's own session
 * resolution, see app/api/bff/_lib/auth.ts's resolveSession) is answered
 * as a valid session for `role`; any call to /api/admin/audit (withAuth's
 * Phase 1D.1 best-effort audit write, see app/api/bff/_lib/audit.ts) is
 * answered with a plain success so it never pollutes a test's own
 * assertions about the *resource's* upstream call count/behavior. Every
 * other call is forwarded to `resourceMock` untouched -- that's where a
 * test's own upstream-response assertions still live.
 */
export function mockAuthenticatedFetch(role: Role, resourceMock: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/admin/auth/session")) return Promise.resolve(sessionCheckResponse(role));
    if (url.includes("/api/admin/audit")) return Promise.resolve(auditWriteResponse());
    return resourceMock(input, init);
  });
}

/** Same session-check auto-handling as mockAuthenticatedFetch, but lets
 * the caller supply its own handler for /api/admin/audit calls too --
 * for tests that specifically assert on the audit write itself (its
 * body, headers, or failure handling). */
export function mockFetchWithAuditControl(
  role: Role,
  resourceMock: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>,
  auditMock: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>,
) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/admin/auth/session")) return Promise.resolve(sessionCheckResponse(role));
    if (url.includes("/api/admin/audit")) return auditMock(input, init);
    return resourceMock(input, init);
  });
}

/** True when `input` is a call to withAuth's own audit-write endpoint --
 * lets a test's resourceMock/assertions distinguish it from the resource's
 * own upstream call without hardcoding the URL substring everywhere. */
export function isAuditCall(input: RequestInfo | URL): boolean {
  return String(input).includes("/api/admin/audit");
}
