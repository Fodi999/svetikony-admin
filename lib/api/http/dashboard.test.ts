import { afterEach, describe, expect, it, vi } from "vitest";
import { dashboardHttpResource } from "./dashboard";
import { ApiError } from "@/types/api";

/** Matches the real BffDashboardStatsDto shape (Phase 2B-6, identity-mapped
 * from svet-ikony's DashboardStatsDto -- see app/api/bff/dashboard/_contract.ts). */
function bffDashboardDto() {
  return {
    newOrders: 2,
    unreadOrders: 3,
    drafts: 4,
    published: 8,
    missingTranslations: 4,
    missingImages: 2,
    prayersWithoutAudio: 1,
    upcomingCalendarDays: [
      { id: "day-1", title: "Різдво", date: "2026-12-25", status: "published" },
      { id: "day-2", title: "Стрітення", date: "2027-02-15", status: "draft" },
    ],
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

/**
 * Phase 2B-6.1: the original Phase 2B-6 report only proved
 * dashboardHttpResource's mapping "indirectly via types" (the BFF contract
 * and the client type share a shape by construction, but nothing actually
 * called getStats() through mocked HTTP transport). This closes that gap
 * with a real runtime call.
 */
describe("dashboardHttpResource.getStats() — real HTTP transport call", () => {
  it("calls GET /api/bff/dashboard and returns the full DashboardStats shape unchanged", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(bffDashboardDto()));
    vi.stubGlobal("fetch", fetchMock);

    const stats = await dashboardHttpResource.getStats();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("/api/bff/dashboard");
    expect(init.method).toBe("GET");

    expect(stats).toEqual({
      newOrders: 2,
      unreadOrders: 3,
      drafts: 4,
      published: 8,
      missingTranslations: 4,
      missingImages: 2,
      prayersWithoutAudio: 1,
      upcomingCalendarDays: [
        { id: "day-1", title: "Різдво", date: "2026-12-25", status: "published" },
        { id: "day-2", title: "Стрітення", date: "2027-02-15", status: "draft" },
      ],
    });
  });

  it("an unrecognized upcoming-day status from the Worker falls back safely to 'draft' rather than crashing (same safeEnum defense as every other module)", async () => {
    const dto = bffDashboardDto();
    dto.upcomingCalendarDays = [{ id: "day-1", title: "Х", date: "2026-12-25", status: "not-a-real-status" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto)));

    const stats = await dashboardHttpResource.getStats();
    expect(stats.upcomingCalendarDays[0]!.status).toBe("draft");
  });

  it("a BFF/backend error (e.g. 403) rejects the promise as a real ApiError -- no mock fallback, no fake stats returned", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "AUTHORIZATION_ERROR", message: "Forbidden" }, 403)));

    await expect(dashboardHttpResource.getStats()).rejects.toBeInstanceOf(ApiError);
  });

  it("a network failure rejects the promise as a real ApiError -- no silent fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );

    await expect(dashboardHttpResource.getStats()).rejects.toBeInstanceOf(ApiError);
  });
});
