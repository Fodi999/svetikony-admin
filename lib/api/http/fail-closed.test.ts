import { afterEach, describe, expect, it, vi } from "vitest";
import { articlesHttpResource } from "./articles";
import { churchInfoHttpResource } from "./church-info";
import { dashboardHttpResource } from "./dashboard";
import { gospelReadingsHttpResource } from "./gospel";
import { ordersHttpResource } from "./orders";
import { ApiError } from "@/types/api";

/**
 * Phase 2C, item 11: the one global invariant that was NOT already proven
 * anywhere else for these 5 resources (Articles/Gospel/ChurchInfo/Orders
 * were "still-temporary mock resources" as recently as Phase 2B-2..2B-5B;
 * Dashboard's own error-rejection case is already covered in
 * lib/api/http/dashboard.test.ts, included here too for one single place
 * that documents all 5 together).
 *
 * Deliberately NOT a re-test of transport.ts's own error-mapping logic
 * (httpGet/httpPost's full status-code-to-ApiError matrix is already
 * exhaustively covered by lib/api/http/transport.test.ts) and NOT a re-test
 * of each BFF route's RBAC (already covered by each route's own
 * app/api/bff/**\/route.test.ts). This only proves the one thing neither of
 * those layers proves on its own: that calling each of these 5 resources'
 * real HTTP methods, when the BFF/backend responds with an error, rejects
 * the promise -- never silently returns mock or fallback data. None of
 * these 5 modules contain a try/catch or any reference to lib/api/mock/**\/
 * lib/mock-data/** (confirmed directly by reading each file, and
 * structurally guaranteed for the whole production adapter by
 * lib/api/http-adapter.source-graph.test.ts), so there is no code path
 * that COULD recover from the rejection below -- this test demonstrates
 * that empirically, one representative call per resource.
 */

function errorResponse(code: string, status: number) {
  return new Response(JSON.stringify({ code, message: "boom" }), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("Fail-closed behavior — representative resources reject on HTTP/BFF failure, never fall back to mock data", () => {
  it("articlesHttpResource.list() rejects with a real ApiError on a 500", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse("INTERNAL_ERROR", 500)));
    await expect(articlesHttpResource.list()).rejects.toBeInstanceOf(ApiError);
  });

  it("gospelReadingsHttpResource.list() rejects with a real ApiError on a 500", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse("INTERNAL_ERROR", 500)));
    await expect(gospelReadingsHttpResource.list()).rejects.toBeInstanceOf(ApiError);
  });

  it("churchInfoHttpResource.get() rejects with a real ApiError on a 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse("AUTHORIZATION_ERROR", 403)));
    await expect(churchInfoHttpResource.get()).rejects.toBeInstanceOf(ApiError);
  });

  it("ordersHttpResource.list() rejects with a real ApiError on a 403 (PII-restricted area)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse("AUTHORIZATION_ERROR", 403)));
    await expect(ordersHttpResource.list()).rejects.toBeInstanceOf(ApiError);
  });

  it("dashboardHttpResource.getStats() rejects with a real ApiError on a 500", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse("INTERNAL_ERROR", 500)));
    await expect(dashboardHttpResource.getStats()).rejects.toBeInstanceOf(ApiError);
  });
});
