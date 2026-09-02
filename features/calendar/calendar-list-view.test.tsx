import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnsavedChangesProvider } from "@/components/feedback/unsaved-changes-context";
import type { CalendarDay } from "@/types/entities";
import { CalendarListView } from "./calendar-list-view";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

const mockList = vi.fn();
const mockRemove = vi.fn();
vi.mock("@/lib/api", () => ({ apiClient: { calendarDays: { list: (q: unknown) => mockList(q), remove: (id: string) => mockRemove(id) } } }));

vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => ({ canEdit: () => true }) }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function day(overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    id: `cal-${Math.random()}`,
    translationGroupId: "grp",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    date: "2026-08-13",
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

function monthKey(year: number, month: number): string {
  // month: 0-11, matches CalendarListView's own cursor convention.
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** Mirrors CalendarListView's own cursor initializer -- avoids fake timers
 * (which fought React Testing Library's async polling) by computing
 * expected month keys off the real current date instead of a frozen one. */
function currentCursor(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function renderView() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UnsavedChangesProvider>
        <CalendarListView />
      </UnsavedChangesProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 500 });
});

describe("CalendarListView", () => {
  it("defaults to Month view and fetches exactly one month-scoped page", async () => {
    const { year, month } = currentCursor();
    renderView();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ month: monthKey(year, month) }));
    // Weekday header from the grid, not the table.
    expect(await screen.findByText("Пн")).toBeInTheDocument();
  });

  it("issues exactly one request per month change -- never one per day", async () => {
    mockList.mockResolvedValue({ items: [day()], total: 1, page: 1, pageSize: 500 });
    const user = userEvent.setup();
    const { year, month } = currentCursor();
    renderView();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Наступний місяць" }));
    const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ month: monthKey(next.year, next.month) }));

    await user.click(screen.getByRole("button", { name: "Попередній місяць" }));
    await user.click(screen.getByRole("button", { name: "Попередній місяць" }));
    const prev = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(4));
    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ month: monthKey(prev.year, prev.month) }));
  });

  it('"Сьогодні" resets the cursor back to the current month', async () => {
    const user = userEvent.setup();
    const { year, month } = currentCursor();
    renderView();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Наступний місяць" }));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole("button", { name: "Сьогодні" }));
    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ month: monthKey(year, month) })));
  });

  it("switches between Month grid and List table without changing route", async () => {
    mockList.mockResolvedValue({ items: [day()], total: 1, page: 1, pageSize: 500 });
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Пн"); // grid visible by default

    await user.click(screen.getByRole("button", { name: "Список" }));
    expect(screen.queryByText("Пн")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Назва" })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Місяць" }));
    expect(await screen.findByText("Пн")).toBeInTheDocument();
  });

  it("clicking an existing day in the grid opens the existing /calendar/[id] editor", async () => {
    const { year, month } = currentCursor();
    const todayDate = `${monthKey(year, month)}-01`;
    mockList.mockResolvedValue({ items: [day({ id: "cal-42", title: "Пророк Самуїл", date: todayDate })], total: 1, page: 1, pageSize: 500 });
    const user = userEvent.setup();
    renderView();
    await screen.findAllByText("Пророк Самуїл");

    // Both the desktop grid cell and the mobile agenda card render the
    // title (CSS-only md:hidden split -- jsdom keeps both in the DOM).
    // The grid cell is the one inside a role="button" container.
    const titles = screen.getAllByText("Пророк Самуїл");
    const gridTitle = titles.find((el) => el.closest('[role="button"]'));
    expect(gridTitle).toBeTruthy();
    await user.click(gridTitle!);
    expect(mockPush).toHaveBeenCalledWith("/calendar/cal-42");
  });

  it("clicking an existing day in the List table also opens /calendar/[id]", async () => {
    mockList.mockResolvedValue({ items: [day({ id: "cal-99", title: "Преображення" })], total: 1, page: 1, pageSize: 500 });
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Пн");
    await user.click(screen.getByRole("button", { name: "Список" }));

    const link = await screen.findByRole("link", { name: "Преображення" });
    expect(link).toHaveAttribute("href", "/calendar/cal-99");
  });

  it("shows the month-scoped summary bar built from the loaded days, not a second request", async () => {
    const { year, month } = currentCursor();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    mockList.mockResolvedValue({
      items: [day({ status: "published" }), day({ status: "draft" })],
      total: 2,
      page: 1,
      pageSize: 500,
    });
    renderView();
    const label = await screen.findByText("днів");
    expect(mockList).toHaveBeenCalledTimes(1);
    // Read the value next to its own "днів" label rather than a bare
    // getByText(daysInMonth) -- the month grid below renders every day
    // number too, so a same-valued day cell would make that ambiguous.
    expect(label.previousSibling?.textContent).toBe(String(daysInMonth));
  });

  it("renders language and status filter controls (existing filters, task section 10)", async () => {
    renderView();
    await screen.findByText("Пн");
    // Language + status Select triggers, alongside the year-select trigger
    // -- 3 comboboxes total. Exact label text isn't asserted here (the
    // Select popup's rendered label is a base-ui internal, exercised more
    // reliably by calendar-day-filters.test.ts's direct logic test).
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(3);
  });
});
