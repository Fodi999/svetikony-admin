/**
 * The stable BFF contract for the Dashboard aggregate. Worker DTO -> BFF
 * DTO here is pure field whitelisting; this one happens to be the
 * identity mapping, since svet-ikony's DashboardStatsDto (Phase 2B-6) was
 * itself designed to contain nothing but aggregates and a bounded,
 * non-PII calendar-day list — there is no internal/PII field to drop.
 * Kept as an explicit contract file (not just re-exporting the Worker
 * type directly) for the same reason every other module has one: the
 * Worker's shape can change without this BFF's promised shape changing
 * with it.
 */
export interface WorkerDashboardUpcomingDay {
  id: string;
  title: string;
  date: string;
  status: string;
}

export interface WorkerDashboardStatsDto {
  newOrders: number;
  unreadOrders: number;
  drafts: number;
  published: number;
  missingTranslations: number;
  missingImages: number;
  prayersWithoutAudio: number;
  upcomingCalendarDays: WorkerDashboardUpcomingDay[];
}

export type BffDashboardStatsDto = WorkerDashboardStatsDto;

export function toBffDashboardStatsDto(worker: WorkerDashboardStatsDto): BffDashboardStatsDto {
  return {
    newOrders: worker.newOrders,
    unreadOrders: worker.unreadOrders,
    drafts: worker.drafts,
    published: worker.published,
    missingTranslations: worker.missingTranslations,
    missingImages: worker.missingImages,
    prayersWithoutAudio: worker.prayersWithoutAudio,
    upcomingCalendarDays: worker.upcomingCalendarDays.map((d) => ({ id: d.id, title: d.title, date: d.date, status: d.status })),
  };
}
