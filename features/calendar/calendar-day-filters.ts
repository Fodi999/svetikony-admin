import type { CalendarDay, ContentStatus, Language } from "@/types/entities";

/** The existing language/status filters (task section 10: "Существующие
 * фильтры... сохранить. Они должны работать и в Місяць, и в Список.").
 * Pulled out as a small pure function so both view modes share one
 * definition and it's directly testable without driving the Select UI. */
export function filterCalendarDays(
  days: CalendarDay[],
  filters: { language: Language | "all"; status: ContentStatus | "all" },
): CalendarDay[] {
  return days.filter(
    (day) => (filters.language === "all" || day.language === filters.language) && (filters.status === "all" || day.status === filters.status),
  );
}
