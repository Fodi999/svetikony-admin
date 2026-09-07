import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../../_lib/test-support";
import { GET, PUT } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

const workerOrder = {
  id: "order-1",
  siteId: "site-1",
  isGlobal: false,
  orderNumber: "IK-000001",
  iconId: "icon-1",
  iconTitleSnapshot: "Ікона «Богоматір Володимирська»",
  iconSlugSnapshot: "bogomater-volodymyrska",
  primaryProductId: null,
  primaryProductNameSnapshot: "",
  primaryProductSlugSnapshot: "",
  primaryProductPriceCentsSnapshot: 0,
  primaryProductPhotoSnapshot: "",
  customerName: "Олена Ковальчук",
  contactMethod: "phone",
  contactValue: "+380671234567",
  preferredContactChannel: "",
  country: "Україна",
  city: "Київ",
  consecrationRequested: false,
  comment: "",
  consentGiven: true,
  status: "new",
  adminNote: "",
  totalPriceCents: 320000,
  currency: "UAH",
  isRead: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  items: [],
};

function putRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/bff/orders/order-1",
    withSessionCookie({ method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  );
}

describe("GET/PUT /api/bff/orders/:id", () => {
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

  describe("GET", () => {
    it("never returns internal Worker fields, for an allowed role", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("order_manager", () =>
          new Response(JSON.stringify(workerOrder), { status: 200, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await GET(new NextRequest("http://localhost/api/bff/orders/order-1", withSessionCookie()), {
        params: Promise.resolve({ id: "order-1" }),
      });
      const bodyText = await response.text();
      expect(bodyText).not.toContain("siteId");
      expect(bodyText).not.toContain("isGlobal");
    });

    it("passes through a 404 unchanged", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("order_manager", () =>
          new Response(JSON.stringify({ code: "NOT_FOUND", message: "order not found" }), { status: 404, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await GET(new NextRequest("http://localhost/api/bff/orders/missing", withSessionCookie()), {
        params: Promise.resolve({ id: "missing" }),
      });
      expect(response.status).toBe(404);
    });

    describe("PII: forbidden roles never receive order detail", () => {
      for (const role of ["editor", "viewer"] as const) {
        it(`${role}: 403, upstream never called, no PII in response`, async () => {
          const fetchMock = mockAuthenticatedFetch(role, () =>
            new Response(JSON.stringify(workerOrder), { status: 200, headers: { "content-type": "application/json" } }),
          );
          vi.stubGlobal("fetch", fetchMock);
          const response = await GET(new NextRequest("http://localhost/api/bff/orders/order-1", withSessionCookie()), {
            params: Promise.resolve({ id: "order-1" }),
          });
          expect(response.status).toBe(403);
          expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/icon-orders"))).toBe(false);
          const bodyText = await response.text();
          expect(bodyText).not.toContain("Олена Ковальчук");
          expect(bodyText).not.toContain("+380671234567");
        });
      }
    });
  });

  describe("PUT — partial update semantics", () => {
    it("a status-only update sends exactly {status}, not adminNote too", async () => {
      const fetchMock = mockAuthenticatedFetch("order_manager", () =>
        new Response(JSON.stringify({ ...workerOrder, status: "contacted" }), { status: 200, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await PUT(putRequest({ status: "contacted" }), { params: Promise.resolve({ id: "order-1" }) });
      expect(response.status).toBe(200);
      const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
      const sentBody = JSON.parse(resourceCall[1]!.body as string);
      expect(sentBody).toEqual({ status: "contacted" });
      const body = (await response.json()) as { status: string };
      expect(body.status).toBe("contacted");
    });

    it("a note-only update sends exactly {adminNote}, not status too", async () => {
      const fetchMock = mockAuthenticatedFetch("order_manager", () =>
        new Response(JSON.stringify({ ...workerOrder, adminNote: "Подзвонити ще раз" }), { status: 200, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await PUT(putRequest({ adminNote: "Подзвонити ще раз" }), { params: Promise.resolve({ id: "order-1" }) });
      expect(response.status).toBe(200);
      const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
      const sentBody = JSON.parse(resourceCall[1]!.body as string);
      expect(sentBody).toEqual({ adminNote: "Подзвонити ще раз" });
    });

    describe("RBAC: forbidden roles never mutate, upstream never called", () => {
      for (const role of ["editor", "viewer"] as const) {
        it(`${role}: 403`, async () => {
          const fetchMock = mockAuthenticatedFetch(role, () =>
            new Response(JSON.stringify(workerOrder), { status: 200, headers: { "content-type": "application/json" } }),
          );
          vi.stubGlobal("fetch", fetchMock);
          const response = await PUT(putRequest({ status: "contacted" }), { params: Promise.resolve({ id: "order-1" }) });
          expect(response.status).toBe(403);
          expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/icon-orders"))).toBe(false);
        });
      }
    });

    it("order_manager can update", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("order_manager", () =>
          new Response(JSON.stringify(workerOrder), { status: 200, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await PUT(putRequest({ status: "confirmed" }), { params: Promise.resolve({ id: "order-1" }) });
      expect(response.status).toBe(200);
    });

    it("super_admin can update", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("super_admin", () =>
          new Response(JSON.stringify(workerOrder), { status: 200, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await PUT(putRequest({ status: "confirmed" }), { params: Promise.resolve({ id: "order-1" }) });
      expect(response.status).toBe(200);
    });

    it("passes through a validation error unchanged (invalid status)", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("order_manager", () =>
          new Response(JSON.stringify({ code: "VALIDATION_ERROR", message: "Validation failed", details: "status must be one of: new, contacted, ..." }), {
            status: 400,
            headers: { "content-type": "application/json" },
          }),
        ),
      );
      const response = await PUT(putRequest({ status: "not_a_real_status" }), { params: Promise.resolve({ id: "order-1" }) });
      expect(response.status).toBe(400);
    });
  });
});
