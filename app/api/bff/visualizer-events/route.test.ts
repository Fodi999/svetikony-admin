import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../_lib/test-support";
import { GET, POST } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

const workerEvent = {
  id: "event-1",
  siteId: "site-1",
  slug: "khreshchennya-rusi",
  language: "uk",
  translationGroupId: "group-1",
  title: "Хрещення Русі",
  summary: "summary",
  description: "description",
  eventType: "historical",
  chronologyType: "exact",
  era: "medieval",
  calendarEra: "AD",
  yearStart: 988,
  yearEnd: null,
  century: 10,
  displayDate: "988",
  sortYear: 988,
  locationName: "Київ",
  latitude: 50.45,
  longitude: 30.52,
  calendarDayId: null,
  status: "published",
  isFeatured: false,
  isGlobal: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  publishedAt: "2026-01-01T00:00:00.000Z",
};

function postRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/bff/visualizer-events",
    withSessionCookie({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  );
}

describe("GET/POST /api/bff/visualizer-events", () => {
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
    it("never returns internal Worker fields (siteId, isGlobal, sortYear)", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("viewer", () =>
          new Response(JSON.stringify([workerEvent]), { status: 200, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await GET(new NextRequest("http://localhost/api/bff/visualizer-events", withSessionCookie()));
      const bodyText = await response.text();
      for (const field of ["siteId", "isGlobal", "sortYear"]) expect(bodyText).not.toContain(field);
      const body = JSON.parse(bodyText);
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe("event-1");
      expect(body[0].title).toBe("Хрещення Русі");
    });

    it("a request with no session cookie at all is rejected before any upstream call", async () => {
      const fetchMock = mockAuthenticatedFetch("viewer", () => new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
      vi.stubGlobal("fetch", fetchMock);
      const response = await GET(new NextRequest("http://localhost/api/bff/visualizer-events"));
      expect(response.status).toBe(401);
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/visualizer-events"))).toBe(false);
    });

    it("forwards language and status query params to the upstream Worker", async () => {
      const fetchMock = mockAuthenticatedFetch("viewer", () =>
        new Response(JSON.stringify([workerEvent]), { status: 200, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      await GET(new NextRequest("http://localhost/api/bff/visualizer-events?language=uk&status=published", withSessionCookie()));
      const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
      const calledUrl = String(resourceCall[0]);
      expect(calledUrl).toContain("language=uk");
      expect(calledUrl).toContain("status=published");
    });
  });

  describe("POST", () => {
    it("an editor can create an event (contentEdit)", async () => {
      const fetchMock = mockAuthenticatedFetch("editor", () =>
        new Response(JSON.stringify(workerEvent), { status: 201, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await POST(postRequest({ title: "Хрещення Русі", slug: "khreshchennya-rusi", language: "uk" }));
      expect(response.status).toBe(201);
      const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
      expect(String(resourceCall[0])).toContain("/api/admin/church-content/visualizer-events");
      expect(resourceCall[1]!.method).toBe("POST");
    });

    it("a viewer is rejected with 403, and the real upstream is never called", async () => {
      const fetchMock = mockAuthenticatedFetch("viewer", () =>
        new Response(JSON.stringify(workerEvent), { status: 201, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await POST(postRequest({ title: "x", slug: "x", language: "uk" }));
      expect(response.status).toBe(403);
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/church-content/visualizer-events"))).toBe(false);
    });

    it("a super_admin can create an event", async () => {
      vi.stubGlobal(
        "fetch",
        mockAuthenticatedFetch("super_admin", () =>
          new Response(JSON.stringify(workerEvent), { status: 201, headers: { "content-type": "application/json" } }),
        ),
      );
      const response = await POST(postRequest({ title: "x", slug: "x", language: "uk" }));
      expect(response.status).toBe(201);
    });
  });
});
