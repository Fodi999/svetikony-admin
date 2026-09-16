import type { ApiClient } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockProducts } from "@/lib/mock-data/products";
import { ApiError } from "@/types/api";
import type { ProductFormValues } from "@/lib/validation/product.schema";
import type { Language, Product, ProductAiField, ProductAiFillResult, ProductAiWriteResult, ProductTranslation } from "@/types/entities";

const STORE_KEY = "products";
const store: Product[] = loadStore(STORE_KEY, mockProducts);
const persist = () => saveStore(STORE_KEY, store);

/** Form values allow optional RU/EN title/fullDescription/seoTitle/
 * seoDescription (react-hook-form fields the admin hasn't touched yet);
 * the entity's own `translations` always holds real strings (mirrors the
 * real backend's *_ru/*_en columns, which are NOT NULL DEFAULT ''), same
 * normalization toEntity() in lib/api/http/products.ts does for the real
 * BFF DTO. */
function normalizeTranslations(values: ProductFormValues): Record<Language, ProductTranslation> {
  return {
    uk: {
      title: values.translations.uk.title,
      fullDescription: values.translations.uk.fullDescription ?? "",
      seoTitle: values.translations.uk.seoTitle ?? "",
      seoDescription: values.translations.uk.seoDescription ?? "",
    },
    ru: {
      title: values.translations.ru.title ?? "",
      fullDescription: values.translations.ru.fullDescription ?? "",
      seoTitle: values.translations.ru.seoTitle ?? "",
      seoDescription: values.translations.ru.seoDescription ?? "",
    },
    en: {
      title: values.translations.en.title ?? "",
      fullDescription: values.translations.en.fullDescription ?? "",
      seoTitle: values.translations.en.seoTitle ?? "",
      seoDescription: values.translations.en.seoDescription ?? "",
    },
  };
}

function getOrThrow(id: string): Product {
  const found = store.find((p) => p.id === id);
  if (!found) notFound("Товар");
  return found;
}

function saveField(id: string, language: Language, field: ProductAiField, value: string): Product {
  const index = store.findIndex((p) => p.id === id);
  if (index === -1) notFound("Товар");
  const current = store[index];
  const updated: Product = {
    ...current,
    translations: { ...current.translations, [language]: { ...current.translations[language], [field]: value } },
    updatedAt: nowIso(),
  };
  store[index] = updated;
  persist();
  return updated;
}

/** Mock mode has no real proposal system -- every generate/regenerate/
 * fill-missing action here always simulates the direct-write outcome,
 * matching Calendar Day/Icon's own mock adapter convention (Stage 1 dev
 * fallback only). */
function direct(product: Product): ProductAiWriteResult {
  return { mode: "direct", product };
}

const MOCK_TEXT: Record<ProductAiField, string> = {
  fullDescription: "Мок-повний опис товару",
  seoTitle: "Мок-SEO заголовок",
  seoDescription: "Мок-SEO опис",
};
const FIELDS: ProductAiField[] = ["fullDescription", "seoTitle", "seoDescription"];
const LANGUAGES: Language[] = ["uk", "ru", "en"];

function requireLinkedIcon(product: Product): void {
  if (!product.linkedIconId) {
    throw new ApiError("validation_error", "Цей товар не пов'язаний з жодною іконою -- AI не має фактів для генерації.");
  }
}

async function generateField(id: string, language: Language, field: ProductAiField, overwrite: boolean): Promise<ProductAiWriteResult> {
  await mockDelay(400);
  const product = getOrThrow(id);
  requireLinkedIcon(product);
  const current = product.translations[language][field];
  if (!overwrite && current.trim()) throw new ApiError("conflict", "Це поле вже заповнене -- скористайтеся регенерацією, щоб замінити текст.");
  return direct(saveField(id, language, field, `${MOCK_TEXT[field]} (${product.title}, ${language}).`));
}

export const productsResource: ApiClient["products"] = {
  async list(query) {
    await mockDelay();
    let items = [...store];
    if (query?.categoryId) items = items.filter((p) => p.categoryId === query.categoryId);
    if (query?.active !== undefined) items = items.filter((p) => p.active === query.active);
    if (query?.featured !== undefined) items = items.filter((p) => p.featured === query.featured);
    items = items.filter((p) => matchesSearch([p.title, p.slug, p.description], query?.search));
    items.sort((a, b) => a.title.localeCompare(b.title));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((p) => p.id === id);
    if (!found) notFound("Товар");
    return found;
  },

  async create(values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug });
    const entity: Product = {
      id: nextId("product"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...values,
      translations: normalizeTranslations(values),
      // Read-only convenience fields mirror translations.uk, same as the
      // real backend's nameUk/seoTitleUk/seoDescriptionUk columns (see
      // toEntity() in lib/api/http/products.ts) — kept in sync here so
      // list views/breadcrumbs/delete dialogs see the freshly-saved UK
      // value.
      title: values.translations.uk.title,
      seoTitle: values.translations.uk.seoTitle || undefined,
      seoDescription: values.translations.uk.seoDescription || undefined,
    };
    store.push(entity);
    persist();
    return entity;
  },

  async update(id, values) {
    await mockDelay();
    const index = store.findIndex((p) => p.id === id);
    if (index === -1) notFound("Товар");
    ensureUniqueSlug({ items: store, slug: values.slug, excludeId: id });
    const updated: Product = {
      ...store[index],
      ...values,
      translations: normalizeTranslations(values),
      title: values.translations.uk.title,
      seoTitle: values.translations.uk.seoTitle || undefined,
      seoDescription: values.translations.uk.seoDescription || undefined,
      updatedAt: nowIso(),
    };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((p) => p.id === id);
    if (index === -1) notFound("Товар");
    store.splice(index, 1);
    persist();
  },

  async generateFullDescription(id, language) {
    return generateField(id, language as Language, "fullDescription", false);
  },
  async regenerateFullDescription(id, language) {
    return generateField(id, language as Language, "fullDescription", true);
  },
  async generateSeoTitle(id, language) {
    return generateField(id, language as Language, "seoTitle", false);
  },
  async regenerateSeoTitle(id, language) {
    return generateField(id, language as Language, "seoTitle", true);
  },
  async generateSeoDescription(id, language) {
    return generateField(id, language as Language, "seoDescription", false);
  },
  async regenerateSeoDescription(id, language) {
    return generateField(id, language as Language, "seoDescription", true);
  },
  async fillMissing(id): Promise<ProductAiFillResult> {
    await mockDelay(800);
    let product = getOrThrow(id);
    requireLinkedIcon(product);
    const filled: { language: Language; field: ProductAiField }[] = [];
    for (const language of LANGUAGES) {
      for (const field of FIELDS) {
        if (!product.translations[language][field].trim()) {
          product = saveField(id, language, field, `${MOCK_TEXT[field]} (${product.title}, ${language}).`);
          filled.push({ language, field });
        }
      }
    }
    return { mode: "direct", product, filled, skipped: [] };
  },
};
