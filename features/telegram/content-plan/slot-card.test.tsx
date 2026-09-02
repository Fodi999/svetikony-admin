import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UnsavedChangesProvider } from "@/components/feedback/unsaved-changes-context";
import type { ContentPlanSlot } from "@/types/entities";
import { SlotCard } from "./slot-card";
import type { SlotActions } from "./use-slot-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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
function renderSlotCard(slot: ContentPlanSlot, actions: SlotActions, calendarDayId: string | null = null) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UnsavedChangesProvider>
        <SlotCard slot={slot} actions={actions} calendarDayId={calendarDayId} />
      </UnsavedChangesProvider>
    </QueryClientProvider>,
  );
}

async function openDropdown(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Додаткові дії" }));
  // base-ui's Menu.Popup mounts into a portal after the trigger click --
  // await its first item rather than asserting on the DOM synchronously.
  await screen.findByRole("menuitem", { name: "Обрати з медіатеки" });
}

describe("SlotCard", () => {
  it("shows only 'Згенерувати текст' (and 'Згенерувати фото') for a SOURCE_READY slot with no content yet", () => {
    renderSlotCard(baseSlot({ publicationStatus: "SOURCE_READY" }), fakeActions());
    expect(screen.getByRole("button", { name: "Згенерувати текст" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редагувати" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Позначити готовим" })).not.toBeInTheDocument();
    // Nothing to regenerate/replace yet -- no dropdown at all.
    expect(screen.queryByRole("button", { name: "Додаткові дії" })).not.toBeInTheDocument();
  });

  it("shows view/edit/mark-ready directly, and puts regenerate behind the [...] dropdown, once text exists on a DRAFT slot", async () => {
    const user = userEvent.setup();
    renderSlotCard(baseSlot({ publicationStatus: "DRAFT", textAvailable: true }), fakeActions());

    expect(screen.getByRole("button", { name: "Переглянути" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Редагувати" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Позначити готовим" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Згенерувати фото" })).toBeInTheDocument(); // imageAvailable is still false
    expect(screen.queryByRole("button", { name: "Зняти з готовності" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Перегенерувати текст" })).not.toBeInTheDocument(); // dropdown starts closed

    await openDropdown(user);
    expect(screen.getByRole("menuitem", { name: "Перегенерувати текст" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Обрати з медіатеки" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Перегенерувати фото" })).not.toBeInTheDocument(); // no image yet
  });

  it("only offers 'Перегенерувати фото' once an image exists", async () => {
    const user = userEvent.setup();
    renderSlotCard(baseSlot({ publicationStatus: "DRAFT", textAvailable: true, imageAvailable: true }), fakeActions());

    expect(screen.queryByRole("button", { name: "Згенерувати фото" })).not.toBeInTheDocument();
    await openDropdown(user);
    expect(screen.getByRole("menuitem", { name: "Перегенерувати фото" })).toBeInTheDocument();
  });

  it("shows only a reduced action set (Переглянути + Зняти з готовності) for a READY slot -- no generate/regenerate/dropdown", () => {
    renderSlotCard(baseSlot({ publicationStatus: "READY", textAvailable: true }), fakeActions());

    expect(screen.getByRole("button", { name: "Переглянути" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Зняти з готовності" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Позначити готовим" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редагувати" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Додаткові дії" })).not.toBeInTheDocument();
  });

  it("renders no action buttons and a single explanatory message for REVIEW_REQUIRED", () => {
    renderSlotCard(baseSlot({ publicationStatus: "REVIEW_REQUIRED" }), fakeActions());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/Потрібна перевірка календаря/)).toBeInTheDocument();
  });

  it("renders no action buttons and a single explanatory message (not repeated) for MISSING_SOURCE, with no calendar link when calendarDayId is unknown", () => {
    renderSlotCard(baseSlot({ publicationStatus: "MISSING_SOURCE", sourceStatus: "missing_source" }), fakeActions());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/відсутнє перевірене джерело/)).toBeInTheDocument();
    // The status badge itself is the only other place "Немає джерела" may appear.
    expect(screen.getAllByText("Немає джерела")).toHaveLength(1);
  });

  it("links MISSING_SOURCE to the Church Calendar editor instead of offering AI actions, when calendarDayId is known", () => {
    renderSlotCard(baseSlot({ publicationStatus: "MISSING_SOURCE", sourceStatus: "missing_source" }), fakeActions(), "cal-day-42");
    expect(screen.getByText(/Потрібно виправити джерело у Церковному календарі/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Відкрити календар/ })).toHaveAttribute("href", "/calendar/cal-day-42");
  });

  it("links REVIEW_REQUIRED to the Church Calendar editor too, when calendarDayId is known", () => {
    renderSlotCard(baseSlot({ publicationStatus: "REVIEW_REQUIRED" }), fakeActions(), "cal-day-7");
    expect(screen.getByRole("link", { name: /Відкрити календар/ })).toHaveAttribute("href", "/calendar/cal-day-7");
  });

  it("renders no mutation buttons at all for SENT -- immutable", () => {
    renderSlotCard(
      baseSlot({ publicationStatus: "SENT", textAvailable: true, telegramMessageId: 555, sentAt: "2026-09-02T10:00:00Z" }),
      fakeActions(),
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/Message ID: 555/)).toBeInTheDocument();
  });

  it("renders no action buttons for SENDING -- shows an in-progress note instead", () => {
    renderSlotCard(baseSlot({ publicationStatus: "SENDING", textAvailable: true }), fakeActions());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/у процесі публікації/)).toBeInTheDocument();
  });

  it("opens the regenerate-text confirmation dialog (from the dropdown) before calling the action", async () => {
    const user = userEvent.setup();
    const actions = fakeActions();
    renderSlotCard(baseSlot({ publicationStatus: "DRAFT", textAvailable: true }), actions);

    await openDropdown(user);
    await user.click(screen.getByRole("menuitem", { name: "Перегенерувати текст" }));
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

  it("disables the visible buttons and the [...] dropdown trigger while an action for this slot is pending", () => {
    renderSlotCard(
      baseSlot({ publicationStatus: "DRAFT", textAvailable: true }),
      fakeActions({ pendingAction: (ct) => (ct === "morning_prayer" ? "regenerateText" : null) }),
    );
    expect(screen.getByRole("button", { name: "Редагувати" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Додаткові дії" })).toBeDisabled();
  });

  it("opens the full-size preview when the image thumbnail is clicked", async () => {
    const user = userEvent.setup();
    renderSlotCard(
      baseSlot({ publicationStatus: "DRAFT", textAvailable: true, imageAvailable: true, imageUrl: "https://x/img.png" }),
      fakeActions(),
    );

    expect(screen.queryByText(/Попередній перегляд у Telegram/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Переглянути зображення" }));
    expect(screen.getByText(/Попередній перегляд у Telegram/)).toBeInTheDocument();
  });
});
