import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

// Authentication itself is covered by the BFF role matrix and manifest tests.
vi.mock("../../_lib/auth", () => ({
  withAuth:
    (_policy: unknown, handler: (...args: unknown[]) => unknown) =>
    (request: unknown, context: unknown) =>
      handler(request, {}, context),
}));

const context = { params: Promise.resolve({ path: [] }) };
function request() {
  return new NextRequest("https://admin.example/api/bff/ai-proposals", {
    headers: { cookie: "admin_session=fixture-session" },
  });
}

describe("AI proposals BFF Workers transport", () => {
  beforeEach(() => {
    vi.stubEnv("SVET_IKONY_API_BASE_URL", "https://backend.example");
    vi.stubEnv("SVET_IKONY_ADMIN_TOKEN", "fixture-service-token");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads proposals using a Workers-compatible redirect policy", async () => {
    const fetchMock = vi.fn(async (_url: unknown, init: RequestInit) => {
      expect(String(_url)).toBe("https://backend.example/api/admin/ai-proposals");
      // workerd rejects redirect:error during Request construction.
      if (init.redirect === "error") throw new TypeError("Invalid redirect value");
      expect(init.redirect).toBe("manual");
      expect(init.headers).toMatchObject({
        Authorization: "Bearer fixture-service-token",
        "X-Admin-Session": "fixture-session",
      });
      return Response.json([]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([301, 302, 307, 308])(
    "rejects upstream %s without following or exposing Location",
    async (status) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(null, {
          status,
          headers: { location: "https://untrusted.example/" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const response = await GET(request(), context);
      expect(response.status).toBe(502);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.text()).not.toMatch(/fixture|untrusted/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
