import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnsavedChangesProvider } from "@/components/feedback/unsaved-changes-context";
import type { CalendarDay } from "@/types/entities";
import { CalendarDayForm } from "./calendar-day-form";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

const mockApi = vi.hoisted(() => ({
  icons: { list: vi.fn() },
  prayers: { list: vi.fn() },
  saints: { list: vi.fn() },
  gospelReadings: { list: vi.fn() },
  calendarDays: {
    list: vi.fn(),
    generateDescription: vi.fn(),
    regenerateDescription: vi.fn(),
    generateHistory: vi.fn(),
    regenerateHistory: vi.fn(),
    generateSeo: vi.fn(),
    regenerateSeo: vi.fn(),
    generateImage: vi.fn(),
    regenerateImage: vi.fn(),
    assignImage: vi.fn(),
    generateImageFromPrompt: vi.fn(),
    fillMissing: vi.fn(),
  },
  media: {},
}));
vi.mock("@/lib/api", () => ({ apiClient: mockApi }));

function baseDay(overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    id: "day-1",
    translationGroupId: "group-1",
    language: "uk",
    date: "2026-09-06",
    dateOldStyle: "2026-08-24",
    title: "Собор Архістратига Михаїла",
    slug: "sobor-arhystratyha-myhaila",
    shortDescription: "Опис дня",
    history: "",
    eventType: "feast",
    status: "draft",
    imageId: undefined,
    seoTitle: null,
    seoDescription: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function emptyList() {
  return Promise.resolve({ items: [], total: 0 });
}

// Defaults every list query to empty; set a mock's return value AFTER this
// (and before render/rerender) to override it for one test -- renderForm()
// itself never touches these, so a per-test override always wins regardless
// of call order relative to renderForm().
beforeEach(() => {
  mockApi.icons.list.mockReturnValue(emptyList());
  mockApi.prayers.list.mockReturnValue(emptyList());
  mockApi.saints.list.mockReturnValue(emptyList());
  mockApi.gospelReadings.list.mockReturnValue(emptyList());
  mockApi.calendarDays.list.mockReturnValue(emptyList());
});

function renderForm(props: Partial<React.ComponentProps<typeof CalendarDayForm>> = {}) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UnsavedChangesProvider>
        <CalendarDayForm mode="edit" onSubmit={vi.fn()} {...props} />
      </UnsavedChangesProvider>
    </QueryClientProvider>,
  );
}

describe("CalendarDayForm loading an existing record", () => {
  it("shows the fetched date and title, not blank fields", () => {
    renderForm({ day: baseDay() });
    expect(screen.getByLabelText("Сучасна дата (григоріанська)")).toHaveValue("2026-09-06");
    expect(screen.getByLabelText("Назва")).toHaveValue("Собор Архістратига Михаїла");
    expect(screen.getByLabelText("Slug")).toHaveValue("sobor-arhystratyha-myhaila");
  });

  it("shows the new record's values, not stale ones, when remounted for a different record (the `key` fix)", () => {
    const { rerender } = renderForm({ day: baseDay() });
    expect(screen.getByLabelText("Сучасна дата (григоріанська)")).toHaveValue("2026-09-06");

    const nextDay = baseDay({
      id: "day-2",
      date: "2026-09-07",
      title: "Передсвято Різдва",
      slug: "peredsvyato-rizdva",
    });
    const queryClient = new QueryClient();
    mockApi.icons.list.mockReturnValue(emptyList());
    mockApi.prayers.list.mockReturnValue(emptyList());
    mockApi.saints.list.mockReturnValue(emptyList());
    mockApi.gospelReadings.list.mockReturnValue(emptyList());
    mockApi.calendarDays.list.mockReturnValue(emptyList());
    rerender(
      <QueryClientProvider client={queryClient}>
        <UnsavedChangesProvider>
          <CalendarDayForm key={nextDay.id} mode="edit" day={nextDay} onSubmit={vi.fn()} />
        </UnsavedChangesProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText("Сучасна дата (григоріанська)")).toHaveValue("2026-09-07");
    expect(screen.getByLabelText("Назва")).toHaveValue("Передсвято Різдва");
  });
});

describe("CalendarDayForm translation switching", () => {
  it("forwards date, eventType and slug (never title/description) when creating a missing translation", async () => {
    const user = userEvent.setup();
    mockApi.calendarDays.list.mockReturnValue(
      Promise.resolve({
        items: [baseDay()],
        total: 1,
      }),
    );
    renderForm({ day: baseDay(), groupId: "group-1" });

    const ruTab = await screen.findByRole("tab", { name: /RU/ });
    await user.click(ruTab);

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = new URL(mockPush.mock.calls[0][0], "http://localhost");
    expect(url.pathname).toBe("/calendar/new");
    expect(url.searchParams.get("groupId")).toBe("group-1");
    expect(url.searchParams.get("language")).toBe("ru");
    expect(url.searchParams.get("slug")).toBe("sobor-arhystratyha-myhaila");
    expect(url.searchParams.get("date")).toBe("2026-09-06");
    expect(url.searchParams.get("eventType")).toBe("feast");
  });
});

describe("CalendarDayForm relations tab", () => {
  it("shows linked children as a read-only reverse lookup by calendarDayId, never an editable picker", async () => {
    const user = userEvent.setup();
    mockApi.saints.list.mockReturnValue(
      Promise.resolve({
        items: [{ id: "saint-1", name: "Архістратиг Михаїл", calendarDayId: "day-1" }],
        total: 1,
      }),
    );
    renderForm({ day: baseDay() });

    await user.click(screen.getByRole("tab", { name: "Зв'язки" }));

    expect(await screen.findByRole("link", { name: "Архістратиг Михаїл" })).toHaveAttribute(
      "href",
      "/saints/saint-1",
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});


describe("CalendarDayForm completeness percentage", () => {
  it("shows a percentage per language, using the live form for the open translation and siblings for the others", async () => {
    mockApi.calendarDays.list.mockReturnValue(
      Promise.resolve({
        items: [
          baseDay(), // uk (open): title + shortDescription filled = 2/6 = 33%
          baseDay({ id: "day-ru", language: "ru", title: "", shortDescription: "" }), // 0/6 = 0%
          baseDay({
            id: "day-en",
            language: "en",
            history: "History",
            imageId: "media-1",
            seoTitle: "SEO",
            seoDescription: "SEO desc",
          }), // all 6 fields = 100%
        ],
        total: 3,
      }),
    );
    renderForm({ day: baseDay(), groupId: "group-1" });

    expect(await screen.findByTitle("UK: заповнено 33%")).toBeInTheDocument();
    expect(await screen.findByTitle("RU: заповнено 0%")).toBeInTheDocument();
    expect(await screen.findByTitle("EN: заповнено 100%")).toBeInTheDocument();
  });
});

describe("CalendarDayForm publish confirmation", () => {
  it("publishes immediately, no dialog, once every field is filled", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const complete = baseDay({ history: "Історія", imageId: "media-1", seoTitle: "SEO", seoDescription: "SEO опис" });
    renderForm({ day: complete, onSubmit });

    await userEvent.click(screen.getByRole("button", { name: "Опублікувати" }));

    expect(screen.queryByText(/Опублікувати заповнене лише на/)).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: "published" }));
  });

  it("asks for confirmation, naming the missing fields, before publishing an incomplete translation", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ day: baseDay(), onSubmit }); // history/image/SEO all empty

    await userEvent.click(screen.getByRole("button", { name: "Опублікувати" }));

    expect(await screen.findByText("Опублікувати заповнене лише на 33%?")).toBeInTheDocument();
    expect(screen.getByText(/Історична довідка, Фото, SEO title, SEO description/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("publishes only after the admin explicitly confirms past the warning", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ day: baseDay(), onSubmit });

    await userEvent.click(screen.getByRole("button", { name: "Опублікувати" }));
    await userEvent.click(await screen.findByRole("button", { name: "Опублікувати попри це" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: "published" }));
  });

  it("cancelling the warning leaves the record unpublished", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ day: baseDay(), onSubmit });

    await userEvent.click(screen.getByRole("button", { name: "Опублікувати" }));
    await userEvent.click(await screen.findByRole("button", { name: "Скасувати" }));

    expect(screen.queryByText(/Опублікувати заповнене лише на/)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("AI creation from an empty date", () => {
  it("shows both dates and starts without requiring title/slug/description", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    renderForm({ mode: "create", initialDate: "2026-10-01", onCreateWithAi: create });
    expect(screen.getByText(/Юліанська дата.*2026-09-18/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Заповнити UK/RU/EN з AI · одне фото" }));
    expect(create).toHaveBeenCalledWith("2026-10-01", "uk");
  });
  it("does not overwrite manually entered text", async () => {
    renderForm({ mode: "create", initialDate: "2026-10-01", onCreateWithAi: vi.fn() });
    await userEvent.type(screen.getByLabelText("Назва"), "Моя назва");
    expect(screen.getByRole("button", { name: "Заповнити UK/RU/EN з AI · одне фото" })).toBeDisabled();
  });
  it("blocks publish and generation while preparing", () => {
    renderForm({ mode: "create", initialDate: "2026-10-01", onCreateWithAi: vi.fn(), submitting: true, preparationStatus: "1/3 · Джерело та AI-текст…" });
    expect(screen.getByRole("button", { name: "Опублікувати" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1/3 · Джерело та AI-текст…" })).toBeDisabled();
  });
});
