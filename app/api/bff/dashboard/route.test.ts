import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../_lib/test-support";
import { GET } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

/** Matches svet-ikony's real DashboardStatsDto shape (Phase 2B-6, see
 * lib/d1/repositories/dashboard.ts) -- aggregate counts plus a bounded,
 * non-PII calendar-day list. No customer fields anywhere. */
const workerDashboardStats = {
  newOrders: 2,
  unreadOrders: 3,
  drafts: 4,
  published: 8,
  missingTranslations: 4,
  missingImages: 2,
  prayersWithoutAudio: 1,
  upcomingCalendarDays: [{ id: "day-1", title: "Різдво", date: "2026-12-25", status: "published" }],
};

function dashboardRequest() {
  return new NextRequest("http://localhost/api/bff/dashboard", withSessionCookie());
}

describe("GET /api/bff/dashboard (read-only aggregate, POLICY.contentView)", () => {
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

  it("a request with no session cookie at all is rejected with 401 before any upstream call", async () => {
    const fetchMock = mockAuthenticatedFetch("viewer", () => new Response(JSON.stringify(workerDashboardStats), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://localhost/api/bff/dashboard"));
    expect(response.status).toBe(401);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/dashboard"))).toBe(false);
  });

  it("super_admin (content: edit) can read it", async () => {
    vi.stubGlobal("fetch", mockAuthenticatedFetch("super_admin", () => new Response(JSON.stringify(workerDashboardStats), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await GET(dashboardRequest());
    expect(response.status).toBe(200);
  });

  it("editor (content: edit) can read it", async () => {
    vi.stubGlobal("fetch", mockAuthenticatedFetch("editor", () => new Response(JSON.stringify(workerDashboardStats), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await GET(dashboardRequest());
    expect(response.status).toBe(200);
  });

  it("viewer (content: view) can read it", async () => {
    vi.stubGlobal("fetch", mockAuthenticatedFetch("viewer", () => new Response(JSON.stringify(workerDashboardStats), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await GET(dashboardRequest());
    expect(response.status).toBe(200);
  });

  it("order_manager (content: none) is rejected with 403, and the real dashboard upstream is never called", async () => {
    const fetchMock = mockAuthenticatedFetch("order_manager", () => new Response(JSON.stringify(workerDashboardStats), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(dashboardRequest());
    expect(response.status).toBe(403);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/admin/dashboard"))).toBe(false);
  });

  it("the response contains no PII -- only aggregate counts and a bounded id/title/date/status calendar-day list", async () => {
    vi.stubGlobal("fetch", mockAuthenticatedFetch("super_admin", () => new Response(JSON.stringify(workerDashboardStats), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await GET(dashboardRequest());
    const bodyText = await response.text();
    for (const piiMarker of ["customerName", "contactValue", "adminNote", "phone", "email", "address"]) {
      expect(bodyText).not.toContain(piiMarker);
    }
    const body = JSON.parse(bodyText);
    expect(body).toEqual(workerDashboardStats);
  });
});
