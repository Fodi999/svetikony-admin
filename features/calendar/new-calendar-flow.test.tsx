import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import NewCalendarDayPage from "@/app/(dashboard)/calendar/new/page";
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), push: vi.fn(), dirty: vi.fn(), error: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/feedback/unsaved-changes-context", () => ({ useUnsavedChanges: () => ({ setDirty: mocks.dirty }) }));
vi.mock("@/components/layout/require-access", () => ({ RequireAccess: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/features/calendar/calendar-day-form", () => ({ CalendarDayForm: ({ onCreateWithAi }: { onCreateWithAi: (date: string, language: string) => Promise<void> }) => <button onClick={() => void onCreateWithAi("2026-10-01", "ru")}>prepare</button> }));
vi.mock("@/features/calendar/prepare-calendar-languages", () => ({ prepareCalendarLanguages: mocks.prepare }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, info: vi.fn(), success: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); mocks.prepare.mockResolvedValue("ru-id"); });
function open() { render(<QueryClientProvider client={new QueryClient()}><NewCalendarDayPage /></QueryClientProvider>); }
it("opens the requested language after completing the group", async () => {
  open(); await userEvent.click(screen.getByText("prepare"));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/calendar/ru-id"));
  expect(mocks.prepare).toHaveBeenCalledWith("2026-10-01", "ru", undefined, expect.any(Function));
});
it("keeps partial failure visible for resume without navigating away", async () => {
  mocks.prepare.mockRejectedValue(new Error("RU saved; EN failed"));
  open(); await userEvent.click(screen.getByText("prepare"));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("RU saved; EN failed"));
  expect(mocks.push).not.toHaveBeenCalled();
});
