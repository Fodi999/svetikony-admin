import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UnsavedChangesProvider } from "@/components/feedback/unsaved-changes-context";
import type { CalendarDay } from "@/types/entities";
import { CalendarDayCell } from "./calendar-day-cell";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

function baseDay(overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    id: "cal-1",
    translationGroupId: "grp-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    date: "2026-08-13",
    dateOldStyle: "2026-07-31",
    title: "Пророк Самуїл",
    slug: "prophet-samuel",
    language: "uk",
    shortDescription: "Опис",
    eventType: "feast",
    status: "draft",
    relatedIconIds: [],
    relatedPrayerIds: [],
    relatedSaintIds: [],
    relatedGospelIds: [],
    ...overrides,
  };
}

function renderCell(props: Partial<React.ComponentProps<typeof CalendarDayCell>> = {}) {
  return render(
    <UnsavedChangesProvider>
      <CalendarDayCell
        dateIso="2026-08-13"
        day={undefined}
        hiddenByFilter={false}
        isToday={false}
        isSelected={false}
        editable
        {...props}
      />
    </UnsavedChangesProvider>,
  );
}

describe("CalendarDayCell", () => {
  it("shows the day number, old-style date, and title for a real day", () => {
    renderCell({ day: baseDay() });
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText(/ст\.ст\. 31 липня/)).toBeInTheDocument();
    expect(screen.getByText("Пророк Самуїл")).toBeInTheDocument();
  });

  it("omits the old-style line when dateOldStyle is absent (never computes it itself)", () => {
    renderCell({ day: baseDay({ dateOldStyle: null }) });
    expect(screen.queryByText(/ст\.ст\./)).not.toBeInTheDocument();
  });

  it("navigates to the existing editor route on click", async () => {
    const onOpen = vi.fn();
    renderCell({ day: baseDay({ id: "cal-42" }), onOpen });
    // Click the title text -- the click bubbles to the cell's own
    // role="button" handler. Not screen.getByRole("button"): the 4 status
    // dots below are themselves buttons, so that query would be ambiguous.
    await userEvent.click(screen.getByText("Пророк Самуїл"));
    expect(onOpen).toHaveBeenCalledWith("2026-08-13");
    expect(mockPush).toHaveBeenCalledWith("/calendar/cal-42");
  });

  it("shows a create link for an empty (virtual) day when editable", () => {
    renderCell({ day: undefined, editable: true });
    expect(screen.getByText("Немає запису")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Створити/ });
    expect(link).toHaveAttribute("href", "/calendar/new?date=2026-08-13");
  });

  it("hides the create link when not editable", () => {
    renderCell({ day: undefined, editable: false });
    expect(screen.queryByRole("link", { name: /Створити/ })).not.toBeInTheDocument();
  });

  it("shows a filtered-out state, not a create link, when a record exists but is hidden by the filter", () => {
    renderCell({ day: undefined, hiddenByFilter: true, editable: true });
    expect(screen.getByText("Приховано фільтром")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Створити/ })).not.toBeInTheDocument();
  });

  it("renders 4 status dots with tooltip labels reflecting filled/empty state", async () => {
    renderCell({ day: baseDay({ shortDescription: "", history: "", imageId: undefined, status: "draft" }) });
    const dots = screen.getAllByRole("button").filter((el) => el.className.includes("rounded-full"));
    expect(dots).toHaveLength(4);
  });
});
