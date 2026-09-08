import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../../_lib/test-support";
import { GET } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

const workerPrayer = {
  id: "prayer-1",
  siteId: "site-1",
  iconId: null,
  calendarDayId: null,
  slug: "otche-nash",
  title: "Отче наш",
  text: "text",
  audioUrl: "",
  qrCodeUrl: "",
  imageUrl: "",
  source: "",
  sourceUrl: "",
  note: "",
  language: "uk",
  prayerType: "prayer",
  translationGroupId: "group-1",
  status: "draft",
  isGlobal: false,
  visualizerEnabled: true,
  visualizerImageUrl: "",
  particleCountDesktop: 50000,
  particleCountMobile: 16000,
  particleSize: 3.5,
  particleColorMode: "silver_gold",
  backgroundColor: "#000000",
  audioReactivity: 0.5,
  sceneTimeline: { idle: 1, assemble: 2, reveal: 3, dissolve: 4 },
  subtitleCues: [{ t: 0, text: "hi" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("GET /api/bff/prayers/:id", () => {
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

  it("never returns internal Worker-only fields (siteId, isGlobal)", async () => {
    vi.stubGlobal(
      "fetch",
      mockAuthenticatedFetch("viewer", () =>
        new Response(JSON.stringify(workerPrayer), { status: 200, headers: { "content-type": "application/json" } }),
      ),
    );
    const response = await GET(
      new NextRequest("http://localhost/api/bff/prayers/prayer-1", withSessionCookie()),
      { params: Promise.resolve({ id: "prayer-1" }) },
    );
    const bodyText = await response.text();
    expect(bodyText).not.toContain("siteId");
    expect(bodyText).not.toContain("isGlobal");
    // PHASE MULTILINGUAL-3: translationGroupId IS now returned.
    expect(JSON.parse(bodyText).translationGroupId).toBe("group-1");
  });

  it("URL-encodes the id in the upstream path", async () => {
    const fetchMock = mockAuthenticatedFetch("viewer", () =>
      new Response(JSON.stringify(workerPrayer), { status: 200, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await GET(
      new NextRequest("http://localhost/api/bff/prayers/id with space", withSessionCookie()),
      { params: Promise.resolve({ id: "id with space" }) },
    );
    const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
    expect(String(resourceCall[0])).toContain("id%20with%20space");
  });

  it("passes through a 404 unchanged", async () => {
    vi.stubGlobal(
      "fetch",
      mockAuthenticatedFetch("viewer", () =>
        new Response(JSON.stringify({ code: "NOT_FOUND", message: "not found" }), { status: 404, headers: { "content-type": "application/json" } }),
      ),
    );
    const response = await GET(
      new NextRequest("http://localhost/api/bff/prayers/missing", withSessionCookie()),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(response.status).toBe(404);
  });
});
