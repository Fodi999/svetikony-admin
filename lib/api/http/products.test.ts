import { describe, expect, it, vi } from "vitest";
import type { BffProductDto } from "@/app/api/bff/products/_contract";
import type { ProductFormValues } from "@/lib/validation/product.schema";

const mockHttpPost = vi.fn();
vi.mock("@/lib/api/http/transport", () => ({
  httpPost: mockHttpPost,
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
}));

const { toEntity, toPayload, productsHttpResource } = await import("./products");

/**
 * Phase D prerequisite regression: linkedIconId <-> linkedIconTranslationGroupId
 * was hardcoded to undefined on both read (toEntity) and write (toPayload) --
 * an admin picking an icon in product-form.tsx's "Пов'язана ікона" select
 * saw it silently vanish on save. Locks in that both directions now
 * actually carry the value, including the "preserve on omit" / "clear via
 * empty string" sentinel contract svet-ikony's resolveUuidSentinel expects.
 */
function bffProduct(overrides: Partial<BffProductDto> = {}): BffProductDto {
  return {
    id: "product-1",
    slug: "ikona-mykolaya",
    nameUk: "Ікона Миколая",
    nameRu: "",
    nameEn: "",
    description: "Опис",
    categoryId: "cat-icons",
    linkedIconTranslationGroupId: null,
    fullDescriptionUk: "",
    fullDescriptionRu: "",
    fullDescriptionEn: "",
    galleryUrls: [],
    photoUrl: "",
    priceCents: 100000,
    currency: "UAH",
    productionTime: "",
    consecrationAvailable: false,
    stockStatus: "available",
    featured: false,
    seoTitleUk: "",
    seoTitleRu: "",
    seoTitleEn: "",
    seoDescriptionUk: "",
    seoDescriptionRu: "",
    seoDescriptionEn: "",
    isActive: true,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function formValues(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return {
    slug: "ikona-mykolaya",
    description: "Опис",
    price: 1000,
    currency: "UAH",
    stockStatus: "in_stock",
    featured: false,
    active: true,
    imageIds: [],
    categoryId: "cat-icons",
    linkedIconId: undefined,
    dimensions: "",
    materials: "",
    productionTimeDays: 0,
    consecrated: false,
    variants: [],
    translations: {
      uk: { title: "Ікона Миколая", fullDescription: "", seoTitle: "", seoDescription: "" },
      ru: { title: "", fullDescription: "", seoTitle: "", seoDescription: "" },
      en: { title: "", fullDescription: "", seoTitle: "", seoDescription: "" },
    },
    ...overrides,
  };
}

describe("products http adapter -- linkedIconId round-trip (Phase D prerequisite)", () => {
  it("toEntity reads linkedIconTranslationGroupId into linkedIconId instead of hardcoding undefined", () => {
    const entity = toEntity(bffProduct({ linkedIconTranslationGroupId: "icon-mykolai" }));
    expect(entity.linkedIconId).toBe("icon-mykolai");
  });

  it("toEntity maps a null linkedIconTranslationGroupId to undefined (no link)", () => {
    const entity = toEntity(bffProduct({ linkedIconTranslationGroupId: null }));
    expect(entity.linkedIconId).toBeUndefined();
  });

  it("toPayload sends the picked linkedIconId instead of dropping it silently", () => {
    const payload = toPayload(formValues({ linkedIconId: "icon-mykolai" }));
    expect(payload.linkedIconTranslationGroupId).toBe("icon-mykolai");
  });

  it("toPayload sends an empty string (not omitted) when unset, so clearing the link actually clears it", () => {
    const payload = toPayload(formValues({ linkedIconId: undefined }));
    expect(payload.linkedIconTranslationGroupId).toBe("");
  });

  it("round-trips through toEntity -> form defaults -> toPayload without losing the link", () => {
    const entity = toEntity(bffProduct({ linkedIconTranslationGroupId: "icon-troitsa" }));
    const payload = toPayload(formValues({ linkedIconId: entity.linkedIconId }));
    expect(payload.linkedIconTranslationGroupId).toBe("icon-troitsa");
  });
});

/**
 * Phase D: the one semantic decision this layer owns for AI shop-copy --
 * splitting a flat Worker field key ("seoTitleRu") into the admin's
 * `{language, field}` shape. A wrong mapping here would silently patch the
 * wrong language's tab (task test list: "existing filled fields not
 * overwritten by fill missing" only holds if the fields land in the RIGHT
 * place to begin with).
 */
describe("products http adapter -- AI shop-copy field mapping (Phase D)", () => {
  it("generateFullDescription posts {language} to the right action path and maps a direct result", async () => {
    mockHttpPost.mockResolvedValue({ mode: "direct", product: bffProduct({ fullDescriptionRu: "Новый текст" }) });

    const result = await productsHttpResource.generateFullDescription("product-1", "ru");

    expect(mockHttpPost).toHaveBeenCalledWith(
      expect.stringContaining("/product-1/generate-full-description"),
      { language: "ru" },
      expect.any(Number),
    );
    expect(result).toMatchObject({ mode: "direct" });
  });

  it("regenerateSeoTitle posts to the regenerate-seo-title action path", async () => {
    mockHttpPost.mockResolvedValue({ mode: "direct", product: bffProduct() });
    await productsHttpResource.regenerateSeoTitle("product-1", "en");
    expect(mockHttpPost).toHaveBeenCalledWith(expect.stringContaining("/product-1/regenerate-seo-title"), { language: "en" }, expect.any(Number));
  });

  it("maps a proposal result without touching the (unchanged) product", async () => {
    mockHttpPost.mockResolvedValue({ mode: "proposal", product: bffProduct(), proposalId: "proposal-1" });
    const result = await productsHttpResource.generateSeoDescription("product-1", "uk");
    expect(result).toMatchObject({ mode: "proposal", proposalId: "proposal-1" });
  });

  it("fillMissing splits every flat field key into its correct {language, field} pair", async () => {
    mockHttpPost.mockResolvedValue({
      mode: "direct",
      product: bffProduct(),
      filled: ["fullDescriptionUk", "seoTitleRu", "seoDescriptionEn"],
      skipped: [{ field: "fullDescriptionEn", reason: "failed" }],
    });

    const result = await productsHttpResource.fillMissing("product-1");

    expect(result).toMatchObject({
      mode: "direct",
      filled: [
        { language: "uk", field: "fullDescription" },
        { language: "ru", field: "seoTitle" },
        { language: "en", field: "seoDescription" },
      ],
      skipped: [{ language: "en", field: "fullDescription", reason: "failed" }],
    });
  });

  it("fillMissing maps a proposal result's proposedFields the same way", async () => {
    mockHttpPost.mockResolvedValue({
      mode: "proposal",
      product: bffProduct(),
      proposalId: null,
      proposedFields: ["seoTitleUk"],
      skipped: [],
    });

    const result = await productsHttpResource.fillMissing("product-1");

    expect(result).toMatchObject({ mode: "proposal", proposedFields: [{ language: "uk", field: "seoTitle" }] });
  });
});
