import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CalendarDay } from "@/types/entities";
import { CalendarSummaryBar } from "./calendar-summary-bar";

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

/** Each stat renders as <span>{value}</span><span>{label}</span> siblings --
 * reads the value next to a given label rather than matching bare numbers,
 * which collide whenever two stats share a value. */
function statValue(label: string): string | null {
  return screen.getByText(label).previousSibling?.textContent ?? null;
}

describe("CalendarSummaryBar", () => {
  it("derives every stat from the provided month days, not a separate request", () => {
    const monthDays = [
      day({ status: "published", shortDescription: "x", imageId: "m1" }),
      day({ status: "published", shortDescription: "x", imageId: "m2" }),
      day({ status: "draft", shortDescription: "", imageId: undefined }),
      day({ status: "draft", shortDescription: "x", imageId: "m3" }),
    ];
    render(<CalendarSummaryBar daysInMonth={31} monthDays={monthDays} />);

    expect(statValue("днів")).toBe("31");
    expect(statValue("створено")).toBe("4");
    expect(statValue("опубліковано")).toBe("2");
    expect(statValue("чернеток")).toBe("2");
    expect(statValue("з фото")).toBe("3"); // 3 of the 4 have imageId set
    expect(statValue("потребують заповнення")).toBe("1"); // only the draft with neither content nor photo
  });

  it("shows zeroes for an empty month rather than crashing", () => {
    render(<CalendarSummaryBar daysInMonth={30} monthDays={[]} />);
    expect(statValue("днів")).toBe("30");
    expect(statValue("створено")).toBe("0");
    expect(statValue("опубліковано")).toBe("0");
  });
});
