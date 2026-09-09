import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthenticatedFetch, withSessionCookie } from "../../_lib/test-support";
import { DELETE } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

describe("DELETE /api/bff/visualizer-models/[id]", () => {
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

  it("forwards ?force=1 to the upstream Worker route unchanged (guards the active Base Earth Model)", async () => {
    const fetchMock = mockAuthenticatedFetch("super_admin", () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await DELETE(
      new NextRequest("http://localhost/api/bff/visualizer-models/model-1?force=1", withSessionCookie({ method: "DELETE" })),
      { params: Promise.resolve({ id: "model-1" }) },
    );

    expect(response.status).toBe(204);
    const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
    expect(String(resourceCall[0])).toContain("/api/admin/church-content/visualizer-models/model-1?force=1");
    expect(resourceCall[1]!.method).toBe("DELETE");
  });

  it("omits the force param entirely when not present on the incoming request", async () => {
    const fetchMock = mockAuthenticatedFetch("super_admin", () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await DELETE(
      new NextRequest("http://localhost/api/bff/visualizer-models/model-1", withSessionCookie({ method: "DELETE" })),
      { params: Promise.resolve({ id: "model-1" }) },
    );

    const resourceCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/api/admin/auth/session"))!;
    expect(String(resourceCall[0])).not.toContain("force");
  });

  it("propagates the upstream's 400 refusal when deleting the base earth model without force", async () => {
    const fetchMock = mockAuthenticatedFetch("super_admin", () =>
      new Response(JSON.stringify({ code: "VALIDATION_ERROR", message: "Cannot delete the active Base Earth Model" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await DELETE(
      new NextRequest("http://localhost/api/bff/visualizer-models/model-1", withSessionCookie({ method: "DELETE" })),
      { params: Promise.resolve({ id: "model-1" }) },
    );

    expect(response.status).toBe(400);
  });
});
