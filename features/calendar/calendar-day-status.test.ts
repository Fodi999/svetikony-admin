import { describe, expect, it } from "vitest";
import type { CalendarDay } from "@/types/entities";
import { calendarDayCompletenessPercent, calendarDayMissingFieldLabels, calendarDayReadiness, calendarDayReadinessGaps, calendarDayStatusFlags, validateCalendarDayLinks, type CalendarDayReadinessInput } from "./calendar-day-status";

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

describe("calendarDayReadiness", () => {
  function readyInput(overrides: Partial<CalendarDayReadinessInput> = {}): CalendarDayReadinessInput {
    return {
      day: baseDay({ shortDescription: "Опис", history: "Історія", imageId: "media-1", seoTitle: "SEO title", seoDescription: "SEO опис" }),
      hasSaint: true,
      hasPrayer: true,
      hasGospel: true,
      translations: { uk: "ready", ru: "ready", en: "ready" },
      ...overrides,
    };
  }

  it("is 100% when every applicable item is ready", () => {
    expect(calendarDayReadiness(readyInput()).percent).toBe(100);
  });

  it("excludes the saint item entirely (n/a) for a civil/fast day with no saint linked", () => {
    const readiness = calendarDayReadiness(readyInput({ day: { ...readyInput().day, eventType: "civil" }, hasSaint: false }));
    expect(readiness.items.find((item) => item.key === "saint")?.state).toBe("n/a");
    expect(readiness.percent).toBe(100);
  });

  it("still scores a missing saint on a feast/memorial day, since one is plausibly expected", () => {
    const readiness = calendarDayReadiness(readyInput({ hasSaint: false }));
    expect(readiness.items.find((item) => item.key === "saint")?.state).toBe("missing");
    expect(readiness.percent).toBeLessThan(100);
  });

  it("matches the mockup's shape: missing EN translation + SEO drags the score below 100 and names both gaps", () => {
    const readiness = calendarDayReadiness(
      readyInput({
        day: { ...readyInput().day, seoTitle: "", seoDescription: "" },
        translations: { uk: "ready", ru: "ready", en: "missing" },
      }),
    );
    expect(readiness.percent).toBeLessThan(100);
    expect(calendarDayReadinessGaps(readiness)).toEqual(expect.arrayContaining(["Переклад EN", "SEO"]));
  });

  it("scores each of prayer/gospel/image independently as missing when absent", () => {
    const readiness = calendarDayReadiness(readyInput({ hasPrayer: false, hasGospel: false, day: { ...readyInput().day, imageId: undefined } }));
    expect(readiness.items.find((item) => item.key === "prayer")?.state).toBe("missing");
    expect(readiness.items.find((item) => item.key === "gospel")?.state).toBe("missing");
    expect(readiness.items.find((item) => item.key === "image")?.state).toBe("missing");
  });

  it("scores main content as partial when only some of title/shortDescription/history are filled", () => {
    const readiness = calendarDayReadiness(readyInput({ day: { ...readyInput().day, history: "" } }));
    expect(readiness.items.find((item) => item.key === "content")?.state).toBe("partial");
  });

  it("never lets a partial translation count as fully ready", () => {
    const readiness = calendarDayReadiness(readyInput({ translations: { uk: "ready", ru: "partial", en: "ready" } }));
    expect(readiness.items.find((item) => item.key === "translation_ru")?.state).toBe("partial");
    expect(readiness.percent).toBeLessThan(100);
  });
});

describe("validateCalendarDayLinks", () => {
  it("flags nothing on a day with exactly one prayer and one gospel reading in the day's own language", () => {
    const issues = validateCalendarDayLinks({
      language: "uk",
      prayers: [{ id: "prayer-1", language: "uk" }],
      gospel: [{ id: "gospel-1", language: "uk" }],
      saints: [{ id: "saint-1", language: "uk" }],
    });
    expect(issues).toEqual([]);
  });

  it("warns about more than one linked prayer", () => {
    const issues = validateCalendarDayLinks({
      language: "uk",
      prayers: [{ id: "p1" }, { id: "p2" }],
      gospel: [{ id: "g1" }],
      saints: [],
    });
    expect(issues).toContainEqual(expect.objectContaining({ severity: "warning", message: expect.stringContaining("Молитва") }));
  });

  it("warns about a language mismatch between a linked record and the day", () => {
    const issues = validateCalendarDayLinks({
      language: "uk",
      prayers: [{ id: "p1", language: "ru" }],
      gospel: [{ id: "g1", language: "uk" }],
      saints: [],
    });
    expect(issues).toContainEqual(expect.objectContaining({ severity: "warning", message: expect.stringContaining("іншою мовою") }));
  });

  it("reports missing prayer/gospel as informational, not a warning -- these are normal until filled", () => {
    const issues = validateCalendarDayLinks({ language: "uk", prayers: [], gospel: [], saints: [] });
    expect(issues.filter((issue) => issue.severity === "info")).toHaveLength(2);
    expect(issues.some((issue) => issue.severity === "warning")).toBe(false);
  });

  it("never invents or writes an id -- it only classifies the ids it was given", () => {
    const input = { language: "uk", prayers: [{ id: "p1", language: "uk" }], gospel: [], saints: [] };
    const issues = validateCalendarDayLinks(input);
    expect(issues.every((issue) => typeof issue.message === "string" && !/\bp1\b/.test(issue.message))).toBe(true);
  });
});
