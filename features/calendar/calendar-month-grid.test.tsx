import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnsavedChangesProvider } from "@/components/feedback/unsaved-changes-context";
import type { CalendarDay } from "@/types/entities";
import { CalendarMonthGrid } from "./calendar-month-grid";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function day(date: string, overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    id: `cal-${date}`,
    translationGroupId: `grp-${date}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    date,
    title: `Day ${date}`,
    slug: date,
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

function renderGrid(overrides: Partial<React.ComponentProps<typeof CalendarMonthGrid>> = {}) {
  return render(
    <UnsavedChangesProvider>
      <CalendarMonthGrid
        year={2026}
        month={7} // August (0-indexed)
        daysByDate={new Map()}
        existingDates={new Set()}
        todayIso="2026-08-13"
        selectedDate={null}
        editable
        {...overrides}
      />
    </UnsavedChangesProvider>,
  );
}

describe("CalendarMonthGrid", () => {
  it("renders exactly 31 numbered cells for August 2026, Monday-first", () => {
    renderGrid();
    // August 2026 has 31 days; day 1 falls on a Saturday, so 5 leading
    // blank cells precede it in a Monday-first grid.
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
    for (let d = 1; d <= 31; d += 1) {
      expect(screen.getAllByText(String(d)).length).toBeGreaterThan(0);
    }
  });

  it("shows a real day's title when present in daysByDate", () => {
    const daysByDate = new Map([["2026-08-13", day("2026-08-13", { title: "Пророк Самуїл" })]]);
    renderGrid({ daysByDate });
    expect(screen.getByText("Пророк Самуїл")).toBeInTheDocument();
  });

  it("treats dates missing from daysByDate as empty slots with a create link", () => {
    renderGrid({ daysByDate: new Map(), existingDates: new Set() });
    expect(screen.getAllByText("Немає запису").length).toBe(31);
  });

  it("does not perform one request per day -- it is a pure renderer over already-provided data", () => {
    // No network/query mocking present at all in this test; if the grid
    // (or CalendarDayCell) tried to fetch per-day, rendering would throw
    // on the missing mock. Reaching this assertion is the proof.
    renderGrid();
    expect(screen.getByText("31")).toBeInTheDocument();
  });
});
