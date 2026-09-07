import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../../../_lib/test-support";
import { PUT } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

function readRequest() {
  return new NextRequest("http://localhost/api/bff/orders/order-1/read", withSessionCookie({ method: "PUT" }));
}

describe("PUT /api/bff/orders/:id/read (mark read only — no mark-unread route exists)", () => {
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

  it("order_manager can mark an order read — proxies to the real .../read path, no body sent", async () => {
    const fetchMock = mockAuthenticatedFetch("order_manager", () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await PUT(readRequest(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(204);
    const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
    expect(String(resourceCall[0])).toBe("http://localhost:3001/api/admin/church-content/icon-orders/order-1/read");
    expect(resourceCall[1]!.body).toBeUndefined();
  });

  it("super_admin can mark an order read", async () => {
    vi.stubGlobal("fetch", mockAuthenticatedFetch("super_admin", () => new Response(null, { status: 204 })));
    const response = await PUT(readRequest(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(204);
  });

  describe("RBAC: forbidden roles never mark read, upstream never called", () => {
    for (const role of ["editor", "viewer"] as const) {
      it(`${role}: 403`, async () => {
        const fetchMock = mockAuthenticatedFetch(role, () => new Response(null, { status: 204 }));
        vi.stubGlobal("fetch", fetchMock);
        const response = await PUT(readRequest(), { params: Promise.resolve({ id: "order-1" }) });
        expect(response.status).toBe(403);
        expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/icon-orders"))).toBe(false);
      });
    }
  });

  it("no cookie -> 401, upstream never called", async () => {
    const fetchMock = mockAuthenticatedFetch("order_manager", () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await PUT(new NextRequest("http://localhost/api/bff/orders/order-1/read", { method: "PUT" }), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(response.status).toBe(401);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/icon-orders"))).toBe(false);
  });
});
