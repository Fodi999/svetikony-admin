import { describe, expect, it } from "vitest";
import type { CalendarDay } from "@/types/entities";
import { calendarDayCompletenessPercent, calendarDayMissingFieldLabels, calendarDayStatusFlags } from "./calendar-day-status";

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

describe("calendarDayCompletenessPercent", () => {
  it("is 0% when no translation exists at all", () => {
    expect(calendarDayCompletenessPercent(undefined)).toBe(0);
  });

  it("is 0% when a translation exists but every completeness field is blank", () => {
    expect(calendarDayCompletenessPercent(baseDay({ title: "", shortDescription: "" }))).toBe(0);
  });

  it("counts title and shortDescription alone as a third of the fields, not full credit", () => {
    expect(calendarDayCompletenessPercent(baseDay({ shortDescription: "Опис" }))).toBe(33);
  });

  it("is 100% only once every field (title, description, history, image, both SEO fields) is filled", () => {
    const full = baseDay({ shortDescription: "Опис", history: "Історія", imageId: "media-1", seoTitle: "SEO title", seoDescription: "SEO опис" });
    expect(calendarDayCompletenessPercent(full)).toBe(100);
  });

  it("treats whitespace-only text the same as empty", () => {
    expect(calendarDayCompletenessPercent(baseDay({ title: "   ", shortDescription: "   " }))).toBe(0);
  });

  it("gives two translations different percentages even when both pass the coarser 'content' flag", () => {
    const withHistoryOnly = baseDay({ shortDescription: "", history: "Історія" });
    const withBothTextFields = baseDay({ shortDescription: "Опис", history: "Історія" });
    expect(calendarDayStatusFlags(withHistoryOnly).content).toBe(true);
    expect(calendarDayStatusFlags(withBothTextFields).content).toBe(true);
    expect(calendarDayCompletenessPercent(withHistoryOnly)).toBeLessThan(calendarDayCompletenessPercent(withBothTextFields));
  });
});

describe("calendarDayMissingFieldLabels", () => {
  it("lists every field when there is no translation at all", () => {
    expect(calendarDayMissingFieldLabels(undefined)).toEqual(["Заголовок", "Короткий опис", "Історична довідка", "Фото", "SEO title", "SEO description"]);
  });

  it("lists only the fields that are actually still empty", () => {
    const day = baseDay({ shortDescription: "Опис", history: "Історія", imageId: "media-1" });
    expect(calendarDayMissingFieldLabels(day)).toEqual(["SEO title", "SEO description"]);
  });

  it("is empty once every field is filled", () => {
    const full = baseDay({ shortDescription: "Опис", history: "Історія", imageId: "media-1", seoTitle: "SEO title", seoDescription: "SEO опис" });
    expect(calendarDayMissingFieldLabels(full)).toEqual([]);
  });
});
