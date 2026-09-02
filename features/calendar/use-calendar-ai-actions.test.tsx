import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { CalendarAiFillResult, CalendarDay } from "@/types/entities";
import { useCalendarAiActions } from "./use-calendar-ai-actions";

const mockApi = vi.hoisted(() => ({
  generateDescription: vi.fn(),
  regenerateDescription: vi.fn(),
  generateHistory: vi.fn(),
  regenerateHistory: vi.fn(),
  generateSeo: vi.fn(),
  regenerateSeo: vi.fn(),
  generateImage: vi.fn(),
  regenerateImage: vi.fn(),
  assignImage: vi.fn(),
  fillMissing: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ apiClient: { calendarDays: mockApi } }));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastInfo = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
    info: (msg: string) => mockToastInfo(msg),
  },
}));

const EMPTY: CalendarDayFormValues = {
  date: "2026-09-02",
  title: "Пророк Самуїл",
  slug: "prophet-samuel",
  language: "uk",
  shortDescription: "",
  history: "",
  eventType: "feast",
  status: "draft",
  imageId: undefined,
  seoTitle: null,
  seoDescription: null,
  relatedIconIds: [],
  relatedPrayerIds: [],
  relatedSaintIds: [],
  relatedGospelIds: [],
};

function calendarDay(overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    id: "day-1",
    translationGroupId: "group",
    language: "uk",
    date: "2026-09-02",
    title: "Пророк Самуїл",
    slug: "prophet-samuel",
    shortDescription: "",
    history: "",
    eventType: "feast",
    status: "draft",
    imageId: undefined,
    seoTitle: null,
    seoDescription: null,
    relatedIconIds: [],
    relatedPrayerIds: [],
    relatedSaintIds: [],
    relatedGospelIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function Harness({ dayId }: { dayId?: string }) {
  const form = useForm<CalendarDayFormValues>({ defaultValues: EMPTY });
  const ai = useCalendarAiActions(dayId, form);
  const shortDescription = form.watch("shortDescription");
  const seoTitle = form.watch("seoTitle");
  const seoDescription = form.watch("seoDescription");

  return (
    <div>
      <p data-testid="shortDescription">{shortDescription}</p>
      <p data-testid="seoTitle">{seoTitle ?? ""}</p>
      <p data-testid="seoDescription">{seoDescription ?? ""}</p>
      <button onClick={ai.generateDescription} disabled={ai.isPending("generateDescription")}>
        generate-description
      </button>
      <button onClick={ai.fillMissing} disabled={ai.isPending("fillMissing")}>
        fill-missing
      </button>
    </div>
  );
}

function renderHarness(dayId = "day-1") {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness dayId={dayId} />
    </QueryClientProvider>,
  );
}

describe("useCalendarAiActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the open form's field directly when generateDescription resolves, without dirtying unrelated fields", async () => {
    const user = userEvent.setup();
    mockApi.generateDescription.mockResolvedValue(calendarDay({ shortDescription: "Згенерований AI-опис." }));
    renderHarness();

    await user.click(screen.getByRole("button", { name: "generate-description" }));

    await waitFor(() => expect(screen.getByTestId("shortDescription")).toHaveTextContent("Згенерований AI-опис."));
    expect(mockApi.generateDescription).toHaveBeenCalledWith("day-1");
  });

  it("shows an error toast and leaves the form untouched when the action fails", async () => {
    const user = userEvent.setup();
    mockApi.generateDescription.mockRejectedValue(new Error("boom"));
    renderHarness();

    await user.click(screen.getByRole("button", { name: "generate-description" }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(screen.getByTestId("shortDescription")).toHaveTextContent("");
  });

  it("fillMissing patches every returned field and summarizes what was filled", async () => {
    const user = userEvent.setup();
    const result: CalendarAiFillResult = {
      day: calendarDay({ shortDescription: "Опис", seoTitle: "Title", seoDescription: "Desc" }),
      filled: ["description", "seo"],
      skipped: [],
    };
    mockApi.fillMissing.mockResolvedValue(result);
    renderHarness();

    await user.click(screen.getByRole("button", { name: "fill-missing" }));

    await waitFor(() => expect(screen.getByTestId("shortDescription")).toHaveTextContent("Опис"));
    expect(screen.getByTestId("seoTitle")).toHaveTextContent("Title");
    expect(screen.getByTestId("seoDescription")).toHaveTextContent("Desc");
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining("короткий опис"));
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining("SEO"));
  });

  it("fillMissing tells the admin to fix the source in the Church Calendar when fields were skipped", async () => {
    const user = userEvent.setup();
    mockApi.fillMissing.mockResolvedValue({
      day: calendarDay(),
      filled: [],
      skipped: [{ field: "description", reason: "review_required" }],
    } satisfies CalendarAiFillResult);
    renderHarness();

    await user.click(screen.getByRole("button", { name: "fill-missing" }));

    await waitFor(() => expect(mockToastInfo).toHaveBeenCalledWith(expect.stringContaining("Церковному календарі")));
  });
});
