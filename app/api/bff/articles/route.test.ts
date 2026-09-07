import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../_lib/test-support";
import { GET, POST } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

const workerArticle = {
  id: "article-1",
  siteId: "site-1",
  iconId: null,
  calendarDayId: null,
  title: "Про ікони",
  slug: "pro-ikony",
  content: "text",
  language: "uk",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
  isGlobal: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function postRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/bff/articles",
    withSessionCookie({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  );
}

describe("GET/POST /api/bff/articles", () => {
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
    it("never returns internal Worker fields (siteId, isGlobal)", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("viewer", () =>
          new Response(JSON.stringify([workerArticle]), { status: 200, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await GET(new NextRequest("http://localhost/api/bff/articles", withSessionCookie()));
      const bodyText = await response.text();
      expect(bodyText).not.toContain("siteId");
      expect(bodyText).not.toContain("isGlobal");
      const body = JSON.parse(bodyText);
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe("article-1");
      expect(body[0].iconId).toBeNull(); // unlike Saints, iconId IS forwarded (see _contract.ts)
    });

    it("a request with no session cookie at all is rejected before any upstream call", async () => {
      const fetchMock = mockAuthenticatedFetch("viewer", () => new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
      vi.stubGlobal("fetch", fetchMock);
      const response = await GET(new NextRequest("http://localhost/api/bff/articles"));
      expect(response.status).toBe(401);
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/articles"))).toBe(false);
    });

    it("a viewer can read the list (contentView)", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("viewer", () =>
          new Response(JSON.stringify([workerArticle]), { status: 200, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await GET(new NextRequest("http://localhost/api/bff/articles", withSessionCookie()));
      expect(response.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("an editor can create an article (contentEdit) — payload maps straight to the Worker's real field names", async () => {
      const fetchMock = mockAuthenticatedFetch("editor", () =>
        new Response(JSON.stringify(workerArticle), { status: 201, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await POST(postRequest({ title: "Про ікони", slug: "pro-ikony", language: "uk", content: "text", status: "draft" }));
      expect(response.status).toBe(201);
      const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
      expect(String(resourceCall[0])).toContain("/api/admin/church-content/articles");
      expect(resourceCall[1]!.method).toBe("POST");
    });

    it("a viewer is rejected with 403, and the real article upstream is never called", async () => {
      const fetchMock = mockAuthenticatedFetch("viewer", () =>
        new Response(JSON.stringify(workerArticle), { status: 201, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await POST(postRequest({ title: "x", slug: "x", language: "uk", content: "1234567890" }));
      expect(response.status).toBe(403);
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/articles"))).toBe(false);
    });

    it("a super_admin can create an article", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("super_admin", () =>
          new Response(JSON.stringify(workerArticle), { status: 201, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await POST(postRequest({ title: "x", slug: "x", language: "uk", content: "1234567890" }));
      expect(response.status).toBe(201);
    });
  });
});
