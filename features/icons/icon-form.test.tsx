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
    generatePortfolio: vi.fn(),
    addPortfolioImages: vi.fn(),
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

describe("IconForm AI portfolio generation", () => {
  it("never lets the admin generate a portfolio for a create-mode (unsaved) icon", () => {
    renderForm({ mode: "create", icon: undefined });
    expect(screen.queryByRole("button", { name: /Згенерувати портфоліо/ })).not.toBeInTheDocument();
  });

  it("disables the generate button when the icon has no main photo yet", async () => {
    const user = userEvent.setup();
    renderForm({ icon: baseIcon({ mainImageId: undefined }) });

    await user.click(screen.getByRole("tab", { name: "Медіа" }));

    expect(screen.getByRole("button", { name: /Згенерувати портфоліо/ })).toBeDisabled();
  });

  it("generates candidates for review and only adds the admin-selected ones to the gallery", async () => {
    const user = userEvent.setup();
    mockApi.icons.generatePortfolio.mockResolvedValue({
      icon: baseIcon({ mainImageId: "media/icons/icon-1/main/photo.png" }),
      generated: [
        { preset: "table_candle", imageUrl: "media/icons/icon-1/portfolio/a.png", sourceImageUrl: "media/icons/icon-1/main/photo.png", generatedAt: "2026-01-01T00:00:00.000Z" },
        { preset: "in_hand", imageUrl: "media/icons/icon-1/portfolio/b.png", sourceImageUrl: "media/icons/icon-1/main/photo.png", generatedAt: "2026-01-01T00:00:00.000Z" },
      ],
      skipped: [],
    });
    mockApi.icons.addPortfolioImages.mockResolvedValue({
      mode: "direct",
      icon: baseIcon({ galleryImageIds: ["media/icons/icon-1/portfolio/a.png"] }),
    });
    renderForm({ icon: baseIcon({ mainImageId: "media/icons/icon-1/main/photo.png" }) });

    await user.click(screen.getByRole("tab", { name: "Медіа" }));
    await user.click(screen.getByRole("button", { name: /Згенерувати портфоліо/ }));

    expect(mockApi.icons.generatePortfolio).toHaveBeenCalledWith("icon-1");
    const candidateButtons = await screen.findAllByRole("button", { name: /На столі зі свічкою|В руках/ });
    expect(candidateButtons).toHaveLength(2);

    // Deselect the second candidate before confirming.
    await user.click(screen.getByRole("button", { name: /В руках/ }));
    await user.click(screen.getByRole("button", { name: "Додати обрані до галереї" }));

    expect(mockApi.icons.addPortfolioImages).toHaveBeenCalledWith("icon-1", [
      { preset: "table_candle", imageUrl: "media/icons/icon-1/portfolio/a.png", sourceImageUrl: "media/icons/icon-1/main/photo.png", generatedAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("on a PUBLISHED icon, confirming never patches the gallery directly -- reports a pending proposal instead", async () => {
    const user = userEvent.setup();
    mockApi.icons.generatePortfolio.mockResolvedValue({
      icon: baseIcon({ status: "published", mainImageId: "media/icons/icon-1/main/photo.png" }),
      generated: [
        { preset: "framed_wall", imageUrl: "media/icons/icon-1/portfolio/c.png", sourceImageUrl: "media/icons/icon-1/main/photo.png", generatedAt: "2026-01-01T00:00:00.000Z" },
      ],
      skipped: [],
    });
    mockApi.icons.addPortfolioImages.mockResolvedValue({
      mode: "proposal",
      icon: baseIcon({ status: "published", galleryImageIds: [] }),
      proposalId: "proposal-1",
    });
    renderForm({ icon: baseIcon({ status: "published", mainImageId: "media/icons/icon-1/main/photo.png" }) });

    await user.click(screen.getByRole("tab", { name: "Медіа" }));
    await user.click(screen.getByRole("button", { name: /Згенерувати портфоліо/ }));
    await screen.findByRole("button", { name: /У рамці на стіні/ });
    await user.click(screen.getByRole("button", { name: "Додати обрані до галереї" }));

    expect(mockApi.icons.addPortfolioImages).toHaveBeenCalledWith("icon-1", [
      { preset: "framed_wall", imageUrl: "media/icons/icon-1/portfolio/c.png", sourceImageUrl: "media/icons/icon-1/main/photo.png", generatedAt: "2026-01-01T00:00:00.000Z" },
    ]);
    // The gallery the admin sees stays exactly as it was -- nothing was
    // silently added to a PUBLISHED icon's public media.
    expect(screen.getByText("Немає фото")).toBeInTheDocument();
  });
});
