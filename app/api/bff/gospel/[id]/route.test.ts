import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../../_lib/test-support";
import { DELETE, GET, PUT } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

const workerGospel = {
  id: "gospel-1",
  siteId: "site-1",
  iconId: null,
  calendarDayId: "cal-1",
  slug: "na-pochatku-bulo-slovo",
  title: "На початку було Слово",
  reference: "Ів. 1:1-17",
  text: "",
  explanation: "",
  language: "uk",
  status: "draft",
  isGlobal: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function putRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/bff/gospel/gospel-1",
    withSessionCookie({ method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  );
}

describe("GET/PUT/DELETE /api/bff/gospel/:id", () => {
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
    it("never returns internal Worker fields, and does forward the real calendarDayId", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("viewer", () =>
          new Response(JSON.stringify(workerGospel), { status: 200, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await GET(new NextRequest("http://localhost/api/bff/gospel/gospel-1", withSessionCookie()), {
        params: Promise.resolve({ id: "gospel-1" }),
      });
      const bodyText = await response.text();
      expect(bodyText).not.toContain("siteId");
      expect(bodyText).not.toContain("isGlobal");
      const body = JSON.parse(bodyText);
      expect(body.calendarDayId).toBe("cal-1");
    });

    it("URL-encodes the id in the upstream path", async () => {
      const fetchMock = mockAuthenticatedFetch("viewer", () =>
        new Response(JSON.stringify(workerGospel), { status: 200, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      await GET(new NextRequest("http://localhost/api/bff/gospel/id with space", withSessionCookie()), {
        params: Promise.resolve({ id: "id with space" }),
      });
      const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
      expect(String(resourceCall[0])).toContain("id%20with%20space");
    });

    it("passes through a 404 unchanged", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("viewer", () =>
          new Response(JSON.stringify({ code: "NOT_FOUND", message: "gospel reading not found" }), { status: 404, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await GET(new NextRequest("http://localhost/api/bff/gospel/missing", withSessionCookie()), {
        params: Promise.resolve({ id: "missing" }),
      });
      expect(response.status).toBe(404);
    });
  });

  describe("PUT", () => {
    it("an editor can update a reading — including fixing just the reference while text stays empty", async () => {
      const fetchMock = mockAuthenticatedFetch("editor", () =>
        new Response(JSON.stringify({ ...workerGospel, reference: "Мт. 2:1-12" }), { status: 200, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await PUT(putRequest({ reference: "Мт. 2:1-12", text: "" }), { params: Promise.resolve({ id: "gospel-1" }) });
      expect(response.status).toBe(200);
      const body = (await response.json()) as { reference: string; text: string };
      expect(body.reference).toBe("Мт. 2:1-12");
      expect(body.text).toBe("");
    });

    it("a viewer is rejected with 403, and the real gospel upstream is never called", async () => {
      const fetchMock = mockAuthenticatedFetch("viewer", () =>
        new Response(JSON.stringify(workerGospel), { status: 200, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await PUT(putRequest({ title: "x" }), { params: Promise.resolve({ id: "gospel-1" }) });
      expect(response.status).toBe(403);
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/gospel"))).toBe(false);
    });
  });

  describe("DELETE", () => {
    it("an editor can delete a reading (real hard delete, not archive)", async () => {
      vi.stubGlobal("fetch", mockAuthenticatedFetch("editor", () => new Response(null, { status: 204 })));
      const response = await DELETE(
        new NextRequest("http://localhost/api/bff/gospel/gospel-1", withSessionCookie({ method: "DELETE" })),
        { params: Promise.resolve({ id: "gospel-1" }) },
      );
      expect(response.status).toBe(204);
    });

    it("a viewer is rejected with 403, and the real gospel upstream is never called", async () => {
      const fetchMock = mockAuthenticatedFetch("viewer", () => new Response(null, { status: 204 }));
      vi.stubGlobal("fetch", fetchMock);
      const response = await DELETE(
        new NextRequest("http://localhost/api/bff/gospel/gospel-1", withSessionCookie({ method: "DELETE" })),
        { params: Promise.resolve({ id: "gospel-1" }) },
      );
      expect(response.status).toBe(403);
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/gospel"))).toBe(false);
    });

    it("a super_admin can delete a reading", async () => {
      vi.stubGlobal("fetch", mockAuthenticatedFetch("super_admin", () => new Response(null, { status: 204 })));
      const response = await DELETE(
        new NextRequest("http://localhost/api/bff/gospel/gospel-1", withSessionCookie({ method: "DELETE" })),
        { params: Promise.resolve({ id: "gospel-1" }) },
      );
      expect(response.status).toBe(204);
    });
  });
});
