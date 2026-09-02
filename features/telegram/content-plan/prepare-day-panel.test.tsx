import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrepareDayReport } from "@/types/entities";
import { PrepareDayPanel } from "./prepare-day-panel";

const mockPrepareDay = vi.fn();
vi.mock("@/lib/api", () => ({
  apiClient: { telegram: { contentPlan: { prepareDay: (date: string) => mockPrepareDay(date) } } },
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (msg: string) => mockToastSuccess(msg), error: (msg: string) => mockToastError(msg) },
}));

function renderPanel() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PrepareDayPanel civilDate="2026-09-30" year={2026} />
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function baseReport(overrides: Partial<PrepareDayReport> = {}): PrepareDayReport {
  return {
    date: "2026-09-30",
    total: 5,
    prepared: 0,
    alreadyPrepared: 0,
    skippedReady: 0,
    skippedSent: 0,
    skippedSending: 0,
    missingSource: 0,
    reviewRequired: 0,
    imageFailed: 0,
    failed: 0,
    results: [],
    ...overrides,
  };
}

function expectResultLine(label: string, value: number) {
  const line = screen.getByText(label).closest("div");
  expect(line?.textContent).toBe(`${label}${value}`);
}

describe("PrepareDayPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a confirmation before calling prepareDay, and never calls it on cancel", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Підготувати весь день" }));
    expect(mockPrepareDay).not.toHaveBeenCalled();
    expect(screen.getByText(/Telegram-публікації не надсилатимуться/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Скасувати" }));
    expect(mockPrepareDay).not.toHaveBeenCalled();
  });

  it("calls prepareDay with the day's civil date once confirmed", async () => {
    const user = userEvent.setup();
    mockPrepareDay.mockResolvedValue(baseReport());
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Підготувати весь день" }));
    await user.click(screen.getByRole("button", { name: "Підготувати" }));

    await waitFor(() => expect(mockPrepareDay).toHaveBeenCalledWith("2026-09-30"));
  });

  it("shows a disabled loading state while in flight -- a second click cannot fire a duplicate request", async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred<PrepareDayReport>();
    mockPrepareDay.mockReturnValue(promise);
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Підготувати весь день" }));
    await user.click(screen.getByRole("button", { name: "Підготувати" }));

    const loadingButton = await screen.findByRole("button", { name: /Підготовка контенту/ });
    expect(loadingButton).toBeDisabled();
    await user.click(loadingButton); // no-op: disabled
    expect(mockPrepareDay).toHaveBeenCalledTimes(1);

    resolve(baseReport());
    await waitFor(() => expect(screen.getByRole("button", { name: "Підготувати весь день" })).not.toBeDisabled());
  });

  it("renders the exact per-outcome summary and toasts success once the request resolves", async () => {
    const user = userEvent.setup();
    mockPrepareDay.mockResolvedValue(
      baseReport({ prepared: 3, alreadyPrepared: 1, missingSource: 1, reviewRequired: 0, failed: 0, imageFailed: 0 }),
    );
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Підготувати весь день" }));
    await user.click(screen.getByRole("button", { name: "Підготувати" }));

    await screen.findByText("Підготовку завершено");
    expect(mockToastSuccess).toHaveBeenCalledWith("Підготовку завершено");
    expectResultLine("Підготовлено", 3);
    expectResultLine("Вже готово", 1);
    expectResultLine("Без джерела", 1);
    expectResultLine("Потребують перевірки", 0);
    expectResultLine("Помилки", 0);
  });

  it("combines failed and imageFailed into a single 'Помилки' count", async () => {
    const user = userEvent.setup();
    mockPrepareDay.mockResolvedValue(baseReport({ prepared: 2, failed: 1, imageFailed: 1 }));
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Підготувати весь день" }));
    await user.click(screen.getByRole("button", { name: "Підготувати" }));

    await screen.findByText("Підготовку завершено");
    expectResultLine("Помилки", 2);
  });

  it("toasts an error and shows no result panel when the request fails", async () => {
    const user = userEvent.setup();
    mockPrepareDay.mockRejectedValue(new Error("boom"));
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Підготувати весь день" }));
    await user.click(screen.getByRole("button", { name: "Підготувати" }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(screen.queryByText("Підготовку завершено")).not.toBeInTheDocument();
  });
});
