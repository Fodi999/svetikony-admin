import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../../../_lib/test-support";
import { POST } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

describe("POST /api/bff/visualizer-models/[id]/set-base-earth", () => {
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

  it("an editor can mark a model as the base earth model", async () => {
    const fetchMock = mockAuthenticatedFetch("editor", () =>
      new Response(JSON.stringify({ id: "model-1", isBaseEarth: true }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/bff/visualizer-models/model-1/set-base-earth", withSessionCookie({ method: "POST" })),
      { params: Promise.resolve({ id: "model-1" }) },
    );

    expect(response.status).toBe(200);
    const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
    expect(String(resourceCall[0])).toContain("/api/admin/church-content/visualizer-models/model-1/set-base-earth");
    expect(resourceCall[1]!.method).toBe("POST");
  });

  it("a viewer is rejected with 403, and the upstream is never called", async () => {
    const fetchMock = mockAuthenticatedFetch("viewer", () => new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/bff/visualizer-models/model-1/set-base-earth", withSessionCookie({ method: "POST" })),
      { params: Promise.resolve({ id: "model-1" }) },
    );

    expect(response.status).toBe(403);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("set-base-earth"))).toBe(false);
  });
});
