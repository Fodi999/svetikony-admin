import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../../_lib/test-support";
import { GET } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

function unreadCountRequest() {
  return new NextRequest("http://localhost/api/bff/orders/unread-count", withSessionCookie());
}

describe("GET /api/bff/orders/unread-count", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    process.env.SVET_IKONY_API_BASE_URL = "http://localhost:3001";
    process.env.SVET_IKONY_ADMIN_TOKEN = "test-secret-jwt-value";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    vi.unstubAllGlobals();
  });

  it("order_manager gets the real count, proxied unchanged from the real upstream path", async () => {
    const fetchMock = mockAuthenticatedFetch("order_manager", () => new Response(JSON.stringify({ count: 3 }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(unreadCountRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 3 });
    const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
    expect(String(resourceCall[0])).toBe("http://localhost:3001/api/admin/church-content/icon-orders/unread-count");
  });

  it("super_admin gets the real count", async () => {
    vi.stubGlobal("fetch", mockAuthenticatedFetch("super_admin", () => new Response(JSON.stringify({ count: 0 }), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await GET(unreadCountRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 0 });
  });

  it("never returns anything beyond {count} -- no order data, no PII", async () => {
    vi.stubGlobal("fetch", mockAuthenticatedFetch("super_admin", () => new Response(JSON.stringify({ count: 5 }), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await GET(unreadCountRequest());
    const body = await response.json();
    expect(Object.keys(body)).toEqual(["count"]);
  });

  describe("RBAC: forbidden roles never see the count, upstream never called", () => {
    for (const role of ["editor", "viewer"] as const) {
      it(`${role}: 403`, async () => {
        const fetchMock = mockAuthenticatedFetch(role, () => new Response(JSON.stringify({ count: 99 }), { status: 200, headers: { "content-type": "application/json" } }));
        vi.stubGlobal("fetch", fetchMock);
        const response = await GET(unreadCountRequest());
        expect(response.status).toBe(403);
        expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/icon-orders"))).toBe(false);
      });
    }
  });

  it("no cookie -> 401, upstream never called", async () => {
    const fetchMock = mockAuthenticatedFetch("order_manager", () => new Response(JSON.stringify({ count: 1 }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://localhost/api/bff/orders/unread-count"));
    expect(response.status).toBe(401);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/icon-orders"))).toBe(false);
  });
});
