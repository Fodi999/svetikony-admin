import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import NewCalendarDayPage from "@/app/(dashboard)/calendar/new/page";

const mocks = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), image: vi.fn(), prepare: vi.fn(), push: vi.fn(), dirty: vi.fn(), error: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/feedback/unsaved-changes-context", () => ({ useUnsavedChanges: () => ({ setDirty: mocks.dirty }) }));
vi.mock("@/components/layout/require-access", () => ({ RequireAccess: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/features/calendar/calendar-day-form", () => ({ CalendarDayForm: ({ onCreateWithAi }: { onCreateWithAi: (date: string, language: string) => Promise<void> }) => <button onClick={() => void onCreateWithAi("2026-10-01", "uk")}>prepare</button> }));
vi.mock("@/lib/api", () => ({ apiClient: { calendarDays: { list: mocks.list, create: mocks.create, generateImage: mocks.image } } }));
vi.mock("@/lib/api/http/transport", () => ({ httpPost: mocks.prepare }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, info: vi.fn(), success: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ items: [] });
  mocks.prepare.mockResolvedValue({ date: "2026-10-01", title: "Пам’яті дня", slug: "calendar-2026-10-01", language: "uk", shortDescription: "Опис дня", history: "Довідка", eventType: "liturgical", status: "published", sourceUrl: "https://www.oca.org/saints/lives/2024/09/18" });
  mocks.create.mockResolvedValue({ id: "new-draft" });
  mocks.image.mockResolvedValue({ mode: "direct" });
});
function open() { render(<QueryClientProvider client={new QueryClient()}><NewCalendarDayPage /></QueryClientProvider>); }
it("saves only a draft then generates its image and opens the editor", async () => {
  open(); await userEvent.click(screen.getByText("prepare"));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/calendar/new-draft"));
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ status: "draft", date: "2026-10-01" }));
  expect(mocks.image).toHaveBeenCalledWith("new-draft");
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
it("opens an existing date without spending AI calls or changing content", async () => {
  mocks.list.mockResolvedValue({ items: [{ id: "existing", date: "2026-10-01", language: "uk" }] });
  open(); await userEvent.click(screen.getByText("prepare"));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/calendar/existing"));
  expect(mocks.prepare).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
});
it("preserves the saved draft and opens it when image generation fails", async () => {
  mocks.image.mockRejectedValue(new Error("image unavailable"));
  open(); await userEvent.click(screen.getByText("prepare"));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/calendar/new-draft"));
  expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("Текст збережено"));
});
it("creates nothing if source/text preparation fails", async () => {
  mocks.prepare.mockRejectedValue(new Error("source unavailable"));
  open(); await userEvent.click(screen.getByText("prepare"));
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.image).not.toHaveBeenCalled();
});
