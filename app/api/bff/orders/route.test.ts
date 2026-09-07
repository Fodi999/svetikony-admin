import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../_lib/test-support";
import { GET } from "./route";

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
  comment: "Будь ласка, доставте до свята.",
  consentGiven: true,
  status: "new",
  adminNote: "Подзвонити після обіду.",
  totalPriceCents: 320000,
  currency: "UAH",
  isRead: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  items: [],
};

describe("GET /api/bff/orders", () => {
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

  it("never returns internal Worker fields (siteId, isGlobal), for an allowed role", async () => {
    vi.stubGlobal(
      "fetch",
      mockAuthenticatedFetch("order_manager", () =>
        new Response(JSON.stringify([workerOrder]), { status: 200, headers: { "content-type": "application/json" } }),
      ),
    );
    const response = await GET(new NextRequest("http://localhost/api/bff/orders", withSessionCookie()));
    const bodyText = await response.text();
    expect(bodyText).not.toContain("siteId");
    expect(bodyText).not.toContain("isGlobal");
    const body = JSON.parse(bodyText);
    expect(body).toHaveLength(1);
    expect(body[0].customerName).toBe("Олена Ковальчук");
  });

  it("a request with no session cookie at all is rejected before any upstream call", async () => {
    const fetchMock = mockAuthenticatedFetch("order_manager", () => new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://localhost/api/bff/orders"));
    expect(response.status).toBe(401);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/icon-orders"))).toBe(false);
  });

  describe("PII: forbidden roles never receive any order data, at all", () => {
    for (const role of ["editor", "viewer"] as const) {
      it(`${role}: 403, upstream never called, response body contains no customer PII`, async () => {
        const fetchMock = mockAuthenticatedFetch(role, () =>
          new Response(JSON.stringify([workerOrder]), { status: 200, headers: { "content-type": "application/json" } }),
        );
        vi.stubGlobal("fetch", fetchMock);
        const response = await GET(new NextRequest("http://localhost/api/bff/orders", withSessionCookie()));
        expect(response.status).toBe(403);
        expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/icon-orders"))).toBe(false);
        const bodyText = await response.text();
        for (const piiFragment of ["Олена Ковальчук", "+380671234567", "Подзвонити після обіду", "Будь ласка, доставте"]) {
          expect(bodyText).not.toContain(piiFragment);
        }
      });
    }
  });

  it("order_manager can list orders", async () => {
    vi.stubGlobal(
      "fetch",
      mockAuthenticatedFetch("order_manager", () =>
        new Response(JSON.stringify([workerOrder]), { status: 200, headers: { "content-type": "application/json" } }),
      ),
    );
    const response = await GET(new NextRequest("http://localhost/api/bff/orders", withSessionCookie()));
    expect(response.status).toBe(200);
  });

  it("super_admin can list orders", async () => {
    vi.stubGlobal(
      "fetch",
      mockAuthenticatedFetch("super_admin", () =>
        new Response(JSON.stringify([workerOrder]), { status: 200, headers: { "content-type": "application/json" } }),
      ),
    );
    const response = await GET(new NextRequest("http://localhost/api/bff/orders", withSessionCookie()));
    expect(response.status).toBe(200);
  });
});
