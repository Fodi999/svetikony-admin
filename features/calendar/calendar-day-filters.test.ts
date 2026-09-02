import { describe, expect, it } from "vitest";
import type { CalendarDay } from "@/types/entities";
import { filterCalendarDays } from "./calendar-day-filters";

function day(overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    id: `cal-${Math.random()}`,
    translationGroupId: "grp",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    date: "2026-08-13",
    title: "Day",
    slug: "day",
    language: "uk",
    shortDescription: "",
    eventType: "feast",
    status: "draft",
    relatedIconIds: [],
    relatedPrayerIds: [],
    relatedSaintIds: [],
    relatedGospelIds: [],
    ...overrides,
  };
}

describe("filterCalendarDays", () => {
  const days = [
    day({ id: "uk-draft", language: "uk", status: "draft" }),
    day({ id: "uk-published", language: "uk", status: "published" }),
    day({ id: "ru-published", language: "ru", status: "published" }),
  ];

  it("returns everything when both filters are 'all'", () => {
    expect(filterCalendarDays(days, { language: "all", status: "all" })).toHaveLength(3);
  });

  it("filters by language", () => {
    const result = filterCalendarDays(days, { language: "ru", status: "all" });
    expect(result.map((d) => d.id)).toEqual(["ru-published"]);
  });

  it("filters by status", () => {
    const result = filterCalendarDays(days, { language: "all", status: "published" });
    expect(result.map((d) => d.id).sort()).toEqual(["ru-published", "uk-published"]);
  });

  it("combines both filters", () => {
    const result = filterCalendarDays(days, { language: "uk", status: "published" });
    expect(result.map((d) => d.id)).toEqual(["uk-published"]);
  });
});
