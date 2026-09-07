import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../_lib/test-support";
import { GET, PUT } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

/** Matches svet-ikony's real emptyChurchInfo() shape exactly (see
 * lib/d1/repositories/churchInfo.ts) -- the synthetic DTO returned at zero
 * rows, not a 404. */
const workerChurchInfoAtZeroRows = {
  id: "00000000-0000-0000-0000-000000000000",
  siteId: "site-1",
  address: "",
  mapsUrl: "",
  phoneOrSite: "",
  priestPhone: "",
  imageUrl: "",
  galleryImages: [],
  translations: {},
  status: "draft",
  createdAt: "",
  updatedAt: "",
};

function putRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/bff/church-info",
    withSessionCookie({ method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  );
}

describe("GET/PUT /api/bff/church-info (singleton -- no [id] route)", () => {
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
    it("never returns internal Worker fields (siteId), and passes through the real zero-row synthetic DTO unchanged", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("viewer", () =>
          new Response(JSON.stringify(workerChurchInfoAtZeroRows), { status: 200, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await GET(new NextRequest("http://localhost/api/bff/church-info", withSessionCookie()));
      const bodyText = await response.text();
      expect(bodyText).not.toContain("siteId");
      const body = JSON.parse(bodyText);
      expect(body.status).toBe("draft");
      expect(body.address).toBe("");
    });

    it("a request with no session cookie at all is rejected before any upstream call", async () => {
      const fetchMock = mockAuthenticatedFetch("viewer", () =>
        new Response(JSON.stringify(workerChurchInfoAtZeroRows), { status: 200, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await GET(new NextRequest("http://localhost/api/bff/church-info"));
      expect(response.status).toBe(401);
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/info"))).toBe(false);
    });

    it("a viewer can read it (contentView)", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("viewer", () =>
          new Response(JSON.stringify(workerChurchInfoAtZeroRows), { status: 200, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await GET(new NextRequest("http://localhost/api/bff/church-info", withSessionCookie()));
      expect(response.status).toBe(200);
    });
  });

  describe("PUT", () => {
    it("an editor can save it (contentEdit) — first-save-as-upsert semantics belong to the Worker, not this proxy", async () => {
      const fetchMock = mockAuthenticatedFetch("editor", () =>
        new Response(JSON.stringify({ ...workerChurchInfoAtZeroRows, address: "вул. Хрещатик, 1" }), { status: 200, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await PUT(putRequest({ address: "вул. Хрещатик, 1", status: "draft", translations: {} }));
      expect(response.status).toBe(200);
      const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
      expect(String(resourceCall[0])).toContain("/api/admin/church-content/info");
      expect(resourceCall[1]!.method).toBe("PUT");
    });

    it("a viewer is rejected with 403, and the real church-info upstream is never called", async () => {
      const fetchMock = mockAuthenticatedFetch("viewer", () =>
        new Response(JSON.stringify(workerChurchInfoAtZeroRows), { status: 200, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await PUT(putRequest({ address: "x" }));
      expect(response.status).toBe(403);
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/info"))).toBe(false);
    });

    it("a super_admin can save it", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("super_admin", () =>
          new Response(JSON.stringify(workerChurchInfoAtZeroRows), { status: 200, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await PUT(putRequest({ address: "x" }));
      expect(response.status).toBe(200);
    });
  });
});
