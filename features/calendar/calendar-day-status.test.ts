import { describe, expect, it } from "vitest";
import type { CalendarDay } from "@/types/entities";
import { calendarDayStatusFlags } from "./calendar-day-status";

function baseDay(overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    id: "cal-1",
    translationGroupId: "grp-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    date: "2026-08-13",
    title: "Пророк Самуїл",
    slug: "prophet-samuel",
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

describe("calendarDayStatusFlags", () => {
  it("marks basic as filled whenever title/date/type/language are present", () => {
    expect(calendarDayStatusFlags(baseDay()).basic).toBe(true);
  });

  it("marks content as filled when shortDescription has text", () => {
    expect(calendarDayStatusFlags(baseDay({ shortDescription: "Text" })).content).toBe(true);
    expect(calendarDayStatusFlags(baseDay({ shortDescription: "   " })).content).toBe(false);
  });

  it("marks content as filled when only history has text", () => {
    expect(calendarDayStatusFlags(baseDay({ shortDescription: "", history: "Історія" })).content).toBe(true);
  });

  it("marks content as empty when both shortDescription and history are blank", () => {
    expect(calendarDayStatusFlags(baseDay({ shortDescription: "", history: "" })).content).toBe(false);
  });

  it("marks photo as filled only when imageId is set", () => {
    expect(calendarDayStatusFlags(baseDay()).photo).toBe(false);
    expect(calendarDayStatusFlags(baseDay({ imageId: "media-1" })).photo).toBe(true);
  });

  it("marks published only for status === published", () => {
    expect(calendarDayStatusFlags(baseDay({ status: "draft" })).published).toBe(false);
    expect(calendarDayStatusFlags(baseDay({ status: "archived" })).published).toBe(false);
    expect(calendarDayStatusFlags(baseDay({ status: "published" })).published).toBe(true);
  });
});
