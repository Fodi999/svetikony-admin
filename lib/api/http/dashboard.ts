import type { z } from "zod";
import type { BffDashboardStatsDto } from "@/app/api/bff/dashboard/_contract";
import type { ApiClient, DashboardStats } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { httpGet } from "@/lib/api/http/transport";
import { contentStatusSchema } from "@/lib/validation/common";
import type { ContentStatus } from "@/types/entities";

/** Same defensive pattern as every other module: fall back rather than an
 * unchecked cast if the Worker's value doesn't match the admin's enum. */
function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

function toStats(dto: BffDashboardStatsDto): DashboardStats {
  return {
    newOrders: dto.newOrders,
    unreadOrders: dto.unreadOrders,
    drafts: dto.drafts,
    published: dto.published,
    upcomingCalendarDays: dto.upcomingCalendarDays.map((d) => ({
      id: d.id,
      title: d.title,
      date: d.date,
      status: safeEnum<ContentStatus>(contentStatusSchema, d.status, "draft"),
    })),
    missingTranslations: dto.missingTranslations,
    missingImages: dto.missingImages,
    prayersWithoutAudio: dto.prayersWithoutAudio,
  };
}

export const dashboardHttpResource: ApiClient["dashboard"] = {
  async getStats(): Promise<DashboardStats> {
    const dto = await httpGet<BffDashboardStatsDto>(BFF_ENDPOINTS.dashboard);
    return toStats(dto);
  },
};
