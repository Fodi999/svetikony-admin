import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnsavedChangesProvider } from "@/components/feedback/unsaved-changes-context";
import type { Icon } from "@/types/entities";
import { IconForm } from "./icon-form";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

const mockApi = vi.hoisted(() => ({
  icons: {
    list: vi.fn(),
    generateDescription: vi.fn(),
    regenerateDescription: vi.fn(),
    generateHistory: vi.fn(),
    regenerateHistory: vi.fn(),
    generateSaintImageDescription: vi.fn(),
    regenerateSaintImageDescription: vi.fn(),
    fillMissing: vi.fn(),
  },
  prayers: { list: vi.fn() },
  articles: { list: vi.fn() },
  calendarDays: { list: vi.fn() },
  media: {},
}));
vi.mock("@/lib/api", () => ({ apiClient: mockApi }));

function baseIcon(overrides: Partial<Icon> = {}): Icon {
  return {
    id: "icon-1",
    translationGroupId: "group-1",
    language: "uk",
    slug: "svt-mykolaia",
    title: "Ікона Св. Миколая",
    description: "",
    history: undefined,
    saintImageDescription: undefined,
    materials: undefined,
    dimensions: undefined,
    mainImageId: undefined,
    galleryImageIds: [],
    relatedPrayerIds: [],
    relatedArticleIds: [],
    calendarDayId: undefined,
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function emptyList() {
  return Promise.resolve({ items: [], total: 0 });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.icons.list.mockReturnValue(emptyList());
  mockApi.prayers.list.mockReturnValue(emptyList());
  mockApi.articles.list.mockReturnValue(emptyList());
  mockApi.calendarDays.list.mockReturnValue(emptyList());
});

function renderForm(props: Partial<React.ComponentProps<typeof IconForm>> = {}) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UnsavedChangesProvider>
        <IconForm mode="edit" onSubmit={vi.fn()} {...props} />
      </UnsavedChangesProvider>
    </QueryClientProvider>,
  );
}

describe("IconForm AI content generation", () => {
  it("shows Згенерувати for an empty description and calls generateDescription", async () => {
    const user = userEvent.setup();
    mockApi.icons.generateDescription.mockResolvedValue({ mode: "direct", icon: baseIcon({ description: "Новий опис." }) });
    renderForm({ icon: baseIcon({ description: "" }) });

    await user.click(screen.getAllByRole("button", { name: "Згенерувати" })[0]);

    expect(mockApi.icons.generateDescription).toHaveBeenCalledWith("icon-1");
    expect(await screen.findByDisplayValue("Новий опис.")).toBeInTheDocument();
  });

  it("shows Перегенерувати for a filled description, and only calls the API after the confirm dialog is accepted", async () => {
    const user = userEvent.setup();
    mockApi.icons.regenerateDescription.mockResolvedValue({ mode: "direct", icon: baseIcon({ description: "Оновлений опис." }) });
    renderForm({ icon: baseIcon({ description: "Вже є опис" }) });

    await user.click(screen.getByRole("button", { name: "Перегенерувати" }));
    expect(mockApi.icons.regenerateDescription).not.toHaveBeenCalled();

    // The confirm dialog's own button shares the same label -- it's the
    // one that appears after the trigger click, i.e. the last match.
    const confirmButtons = await screen.findAllByRole("button", { name: "Перегенерувати" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(mockApi.icons.regenerateDescription).toHaveBeenCalledWith("icon-1");
  });

  it("never lets the admin generate content for a create-mode (unsaved) icon", () => {
    renderForm({ mode: "create", icon: undefined });
    expect(screen.queryByRole("button", { name: "Згенерувати" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Заповнити відсутнє з AI" })).not.toBeInTheDocument();
  });

  it("fillMissing patches every empty field it can and leaves already-filled fields alone", async () => {
    const user = userEvent.setup();
    mockApi.icons.fillMissing.mockResolvedValue({
      mode: "direct",
      icon: baseIcon({ description: "AI опис", history: "AI історія", saintImageDescription: "AI опис образу" }),
      filled: ["description", "history", "saintImageDescription"],
      skipped: [],
    });
    renderForm({ icon: baseIcon({ description: "", history: undefined, saintImageDescription: undefined }) });

    await user.click(screen.getByRole("button", { name: "Заповнити відсутнє з AI" }));

    expect(mockApi.icons.fillMissing).toHaveBeenCalledWith("icon-1");
    expect(await screen.findByDisplayValue("AI опис")).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI історія")).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI опис образу")).toBeInTheDocument();
  });

  it("on a PUBLISHED icon, a successful generate never patches the form directly -- it reports a pending proposal instead", async () => {
    const user = userEvent.setup();
    mockApi.icons.generateDescription.mockResolvedValue({ mode: "proposal", icon: baseIcon({ status: "published" }), proposalId: "proposal-1" });
    renderForm({ icon: baseIcon({ description: "", status: "published" }) });

    await user.click(screen.getAllByRole("button", { name: "Згенерувати" })[0]);

    expect(mockApi.icons.generateDescription).toHaveBeenCalledWith("icon-1");
    // The record was never touched -- the field the admin sees stays empty.
    expect(await screen.findByLabelText("Опис")).toHaveValue("");
  });
});
