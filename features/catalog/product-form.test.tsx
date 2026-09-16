import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnsavedChangesProvider } from "@/components/feedback/unsaved-changes-context";
import type { Icon, Product } from "@/types/entities";
import { dedupeIconOptionsByGroup, ProductForm } from "./product-form";

const mockApi = vi.hoisted(() => ({
  products: {
    generateFullDescription: vi.fn(),
    regenerateFullDescription: vi.fn(),
    generateSeoTitle: vi.fn(),
    regenerateSeoTitle: vi.fn(),
    generateSeoDescription: vi.fn(),
    regenerateSeoDescription: vi.fn(),
    fillMissing: vi.fn(),
  },
  categories: { list: vi.fn() },
  icons: { list: vi.fn() },
  media: {},
}));
vi.mock("@/lib/api", () => ({ apiClient: mockApi }));

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    title: "Ікона Миколая",
    slug: "ikona-mykolaya",
    description: "Плоский опис",
    price: 150000,
    currency: "UAH",
    stockStatus: "in_stock",
    featured: false,
    active: false,
    imageIds: [],
    categoryId: "cat-icons",
    linkedIconId: "icon-mykolai",
    dimensions: undefined,
    materials: undefined,
    productionTimeDays: 7,
    consecrated: false,
    variants: [],
    translations: {
      uk: { title: "Ікона Миколая", fullDescription: "", seoTitle: "", seoDescription: "" },
      ru: { title: "Икона Николая", fullDescription: "", seoTitle: "", seoDescription: "" },
      en: { title: "Icon of Nicholas", fullDescription: "", seoTitle: "", seoDescription: "" },
    },
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
  mockApi.categories.list.mockReturnValue(emptyList());
  mockApi.icons.list.mockReturnValue(emptyList());
});

function renderForm(props: Partial<React.ComponentProps<typeof ProductForm>> = {}) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UnsavedChangesProvider>
        <ProductForm mode="edit" onSubmit={vi.fn()} {...props} />
      </UnsavedChangesProvider>
    </QueryClientProvider>,
  );
}

/**
 * Phase D prerequisite: `linkedIconId` stores an icon's translationGroupId,
 * not a specific row id -- Icons are one-row-per-language
 * (translationGroupId shared across uk/ru/en rows), so the "Пов'язана
 * ікона" picker must show ONE option per group, not one per language row
 * (which would offer 3 identical-value options with different labels).
 */
function icon(overrides: Partial<Icon> = {}): Icon {
  return {
    id: "icon-1-uk",
    translationGroupId: "icon-1",
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

describe("dedupeIconOptionsByGroup", () => {
  it("collapses a group's uk/ru/en rows into a single option", () => {
    const options = dedupeIconOptionsByGroup([
      icon({ id: "icon-1-uk", translationGroupId: "icon-1", language: "uk", title: "Ікона Св. Миколая" }),
      icon({ id: "icon-1-ru", translationGroupId: "icon-1", language: "ru", title: "Икона Св. Николая" }),
      icon({ id: "icon-1-en", translationGroupId: "icon-1", language: "en", title: "Icon of St. Nicholas" }),
    ]);

    expect(options).toHaveLength(1);
    expect(options[0].value).toBe("icon-1");
  });

  it("prefers the uk-language title as the label regardless of row order", () => {
    const options = dedupeIconOptionsByGroup([
      icon({ id: "icon-1-en", translationGroupId: "icon-1", language: "en", title: "Icon of St. Nicholas" }),
      icon({ id: "icon-1-ru", translationGroupId: "icon-1", language: "ru", title: "Икона Св. Николая" }),
      icon({ id: "icon-1-uk", translationGroupId: "icon-1", language: "uk", title: "Ікона Св. Миколая" }),
    ]);

    expect(options).toEqual([{ value: "icon-1", label: "Ікона Св. Миколая" }]);
  });

  it("falls back to whichever language is available when a group has no uk row", () => {
    const options = dedupeIconOptionsByGroup([
      icon({ id: "icon-2-en", translationGroupId: "icon-2", language: "en", title: "The Holy Trinity" }),
      icon({ id: "icon-2-ru", translationGroupId: "icon-2", language: "ru", title: "Святая Троица" }),
    ]);

    expect(options).toEqual([{ value: "icon-2", label: "Святая Троица" }]);
  });

  it("keeps distinct groups as separate options", () => {
    const options = dedupeIconOptionsByGroup([
      icon({ id: "icon-1-uk", translationGroupId: "icon-1", language: "uk", title: "Ікона Св. Миколая" }),
      icon({ id: "icon-2-uk", translationGroupId: "icon-2", language: "uk", title: "Свята Трійця" }),
    ]);

    expect(options).toHaveLength(2);
    expect(options.map((o) => o.value).sort()).toEqual(["icon-1", "icon-2"]);
  });

  it("returns an empty list for no icons", () => {
    expect(dedupeIconOptionsByGroup([])).toEqual([]);
  });
});

describe("ProductForm AI shop-copy generation", () => {
  it("never lets the admin generate shop copy for a create-mode (unsaved) product", () => {
    renderForm({ mode: "create", product: undefined });
    expect(screen.queryByRole("button", { name: /Заповнити відсутнє з AI/ })).not.toBeInTheDocument();
  });

  it("disables the top fill-missing button and shows a clear message when the product has no linked icon", () => {
    renderForm({ product: baseProduct({ linkedIconId: undefined }) });
    const button = screen.getByRole("button", { name: /Заповнити відсутнє з AI/ });
    expect(button).toBeDisabled();
    expect(screen.getByText(/Оберіть пов'язану ікону/)).toBeInTheDocument();
  });

  it("shows Згенерувати for an empty full description and calls generateFullDescription with the active tab's language", async () => {
    const user = userEvent.setup();
    mockApi.products.generateFullDescription.mockResolvedValue({
      mode: "direct",
      product: baseProduct({ translations: { uk: { title: "Ікона Миколая", fullDescription: "Новий опис товару.", seoTitle: "", seoDescription: "" }, ru: { title: "", fullDescription: "", seoTitle: "", seoDescription: "" }, en: { title: "", fullDescription: "", seoTitle: "", seoDescription: "" } } }),
    });
    renderForm({ product: baseProduct() });

    await user.click(screen.getByRole("button", { name: "Згенерувати" }));

    expect(mockApi.products.generateFullDescription).toHaveBeenCalledWith("product-1", "uk");
    expect(await screen.findByDisplayValue("Новий опис товару.")).toBeInTheDocument();
  });

  it("shows Перегенерувати for a filled field, and only calls the API after the confirm dialog is accepted", async () => {
    const user = userEvent.setup();
    mockApi.products.regenerateFullDescription.mockResolvedValue({
      mode: "direct",
      product: baseProduct({ translations: { uk: { title: "Ікона Миколая", fullDescription: "Оновлений опис.", seoTitle: "", seoDescription: "" }, ru: { title: "", fullDescription: "", seoTitle: "", seoDescription: "" }, en: { title: "", fullDescription: "", seoTitle: "", seoDescription: "" } } }),
    });
    renderForm({ product: baseProduct({ translations: { uk: { title: "Ікона Миколая", fullDescription: "Вже є опис", seoTitle: "", seoDescription: "" }, ru: { title: "", fullDescription: "", seoTitle: "", seoDescription: "" }, en: { title: "", fullDescription: "", seoTitle: "", seoDescription: "" } } }) });

    await user.click(screen.getByRole("button", { name: "Перегенерувати" }));
    expect(mockApi.products.regenerateFullDescription).not.toHaveBeenCalled();

    const confirmButtons = await screen.findAllByRole("button", { name: "Перегенерувати" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(mockApi.products.regenerateFullDescription).toHaveBeenCalledWith("product-1", "uk");
  });

  it("disables the per-field generate button when the product has no linked icon", () => {
    renderForm({ product: baseProduct({ linkedIconId: undefined }) });
    expect(screen.getByRole("button", { name: "Згенерувати" })).toBeDisabled();
  });

  it("fillMissing patches SEO fields for the active language", async () => {
    const user = userEvent.setup();
    mockApi.products.fillMissing.mockResolvedValue({
      mode: "direct",
      product: baseProduct({ translations: { uk: { title: "Ікона Миколая", fullDescription: "", seoTitle: "AI заголовок", seoDescription: "AI опис" }, ru: { title: "", fullDescription: "", seoTitle: "", seoDescription: "" }, en: { title: "", fullDescription: "", seoTitle: "", seoDescription: "" } } }),
      filled: [{ language: "uk", field: "seoTitle" }, { language: "uk", field: "seoDescription" }],
      skipped: [],
    });
    renderForm({ product: baseProduct() });

    await user.click(screen.getByRole("button", { name: /Заповнити відсутнє з AI/ }));

    expect(mockApi.products.fillMissing).toHaveBeenCalledWith("product-1");
    await user.click(screen.getByRole("tab", { name: "SEO" }));
    expect(await screen.findByDisplayValue("AI заголовок")).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI опис")).toBeInTheDocument();
  });

  it("on an active (published) product, a successful generate never patches the form directly -- reports a pending proposal instead", async () => {
    const user = userEvent.setup();
    mockApi.products.generateFullDescription.mockResolvedValue({
      mode: "proposal",
      product: baseProduct({ active: true }),
      proposalId: "proposal-1",
    });
    renderForm({ product: baseProduct({ active: true }) });

    await user.click(screen.getByRole("button", { name: "Згенерувати" }));

    expect(mockApi.products.generateFullDescription).toHaveBeenCalledWith("product-1", "uk");
    expect(await screen.findByLabelText("Повний опис")).toHaveValue("");
  });
});
