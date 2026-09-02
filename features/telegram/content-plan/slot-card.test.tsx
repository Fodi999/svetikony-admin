import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ContentPlanSlot } from "@/types/entities";
import { SlotCard } from "./slot-card";
import type { SlotActions } from "./use-slot-actions";

function fakeActions(overrides: Partial<SlotActions> = {}): SlotActions {
  return {
    generateText: vi.fn(),
    regenerateText: vi.fn(),
    editText: vi.fn(),
    generateImage: vi.fn(),
    regenerateImage: vi.fn(),
    assignImage: vi.fn(),
    markReady: vi.fn(),
    markUnready: vi.fn(),
    pendingAction: () => null,
    ...overrides,
  };
}

function baseSlot(overrides: Partial<ContentPlanSlot> = {}): ContentPlanSlot {
  return {
    contentType: "morning_prayer",
    scheduledTime: "07:00",
    sourceStatus: "available",
    verificationStatus: null,
    publicationStatus: "DRAFT",
    textAvailable: false,
    imageAvailable: false,
    sentAt: null,
    telegramMessageId: null,
    errorMessage: null,
    ...overrides,
  };
}

/** MediaPickerDialog (always rendered inside SlotCard, just hidden) calls
 * useQuery internally -- a QueryClientProvider ancestor is required even
 * when nothing is actually fetched (its query is `enabled: open`, and
 * every test here leaves the picker closed). */
function renderSlotCard(slot: ContentPlanSlot, actions: SlotActions) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <SlotCard slot={slot} actions={actions} />
    </QueryClientProvider>,
  );
}

describe("SlotCard", () => {
  it("shows only 'Згенерувати текст' for a SOURCE_READY slot with no text yet", () => {
    renderSlotCard(baseSlot({ publicationStatus: "SOURCE_READY" }), fakeActions());
    expect(screen.getByRole("button", { name: "Згенерувати текст" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редагувати" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Позначити готовим" })).not.toBeInTheDocument();
  });

  it("shows edit/regenerate/mark-ready once text exists on a DRAFT slot", () => {
    renderSlotCard(baseSlot({ publicationStatus: "DRAFT", textAvailable: true }), fakeActions());
    expect(screen.getByRole("button", { name: "Редагувати" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Перегенерувати текст" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Позначити готовим" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Зняти з готовності" })).not.toBeInTheDocument();
  });

  it("shows 'Зняти з готовності' instead of 'Позначити готовим' for a READY slot", () => {
    renderSlotCard(baseSlot({ publicationStatus: "READY", textAvailable: true }), fakeActions());
    expect(screen.getByRole("button", { name: "Зняти з готовності" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Позначити готовим" })).not.toBeInTheDocument();
  });

  it("renders no action buttons at all for REVIEW_REQUIRED", () => {
    renderSlotCard(baseSlot({ publicationStatus: "REVIEW_REQUIRED" }), fakeActions());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Потрібна перевірка календаря")).toBeInTheDocument();
  });

  it("renders no action buttons at all for MISSING_SOURCE", () => {
    renderSlotCard(baseSlot({ publicationStatus: "MISSING_SOURCE", sourceStatus: "missing_source" }), fakeActions());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getAllByText("Немає джерела").length).toBeGreaterThan(0);
  });

  it("renders no action buttons at all for SENT -- immutable", () => {
    renderSlotCard(
      baseSlot({ publicationStatus: "SENT", textAvailable: true, telegramMessageId: 555, sentAt: "2026-09-02T10:00:00Z" }),
      fakeActions(),
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/Message ID: 555/)).toBeInTheDocument();
  });

  it("opens the regenerate-text confirmation dialog before calling the action", async () => {
    const user = userEvent.setup();
    const actions = fakeActions();
    renderSlotCard(baseSlot({ publicationStatus: "DRAFT", textAvailable: true }), actions);

    await user.click(screen.getByRole("button", { name: "Перегенерувати текст" }));
    expect(actions.regenerateText).not.toHaveBeenCalled();
    expect(screen.getByText("Поточний текст буде замінено новою AI-версією.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Перегенерувати" }));
    expect(actions.regenerateText).toHaveBeenCalledWith("morning_prayer");
  });

  it("calls generateText directly without a confirmation (nothing to lose yet)", async () => {
    const user = userEvent.setup();
    const actions = fakeActions();
    renderSlotCard(baseSlot({ publicationStatus: "SOURCE_READY" }), actions);

    await user.click(screen.getByRole("button", { name: "Згенерувати текст" }));
    expect(actions.generateText).toHaveBeenCalledWith("morning_prayer");
  });

  it("disables the visible action buttons while an action for this slot is pending", () => {
    renderSlotCard(
      baseSlot({ publicationStatus: "DRAFT", textAvailable: true }),
      fakeActions({ pendingAction: (ct) => (ct === "morning_prayer" ? "regenerateText" : null) }),
    );
    expect(screen.getByRole("button", { name: "Редагувати" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Регенерація…" })).toBeDisabled();
  });
});
