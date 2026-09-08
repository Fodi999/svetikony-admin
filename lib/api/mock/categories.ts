import type { CrudResource } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockCategories } from "@/lib/mock-data/categories";
import type { ProductCategoryFormValues } from "@/lib/validation/category.schema";
import type { ListQuery } from "@/types/api";
import type { Language, ProductCategory, ProductCategoryTranslation } from "@/types/entities";

const STORE_KEY = "categories";
const store: ProductCategory[] = loadStore(STORE_KEY, mockCategories);
const persist = () => saveStore(STORE_KEY, store);

/** Form values allow optional RU/EN name/description (react-hook-form
 * fields the admin hasn't touched yet); the entity's own `translations`
 * always holds real strings (mirrors the real backend's *_ru/*_en columns,
 * which are NOT NULL DEFAULT ''), same normalization toEntity() in
 * lib/api/http/product-categories.ts does for the real BFF DTO. */
function normalizeTranslations(values: ProductCategoryFormValues): Record<Language, ProductCategoryTranslation> {
  return {
    uk: { name: values.translations.uk.name, description: values.translations.uk.description ?? "" },
    ru: { name: values.translations.ru.name ?? "", description: values.translations.ru.description ?? "" },
    en: { name: values.translations.en.name ?? "", description: values.translations.en.description ?? "" },
  };
}

export const categoriesResource: CrudResource<ProductCategory, ProductCategoryFormValues, ListQuery> = {
  async list(query) {
    await mockDelay();
    let items = [...store];
    items = items.filter((c) => matchesSearch([c.name, c.slug], query?.search));
    items.sort((a, b) => a.order - b.order);
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((c) => c.id === id);
    if (!found) notFound("Категорія");
    return found;
  },

  async create(values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug });
    const entity: ProductCategory = {
      id: nextId("cat"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...values,
      translations: normalizeTranslations(values),
      // Read-only convenience fields mirror translations.uk, same as the
      // real backend's nameUk/descriptionUk columns (see toEntity() in
      // lib/api/http/product-categories.ts) — kept in sync here so list
      // views/breadcrumbs/delete dialogs see the freshly-saved UK value.
      name: values.translations.uk.name,
      description: values.translations.uk.description || undefined,
    };
    store.push(entity);
    persist();
    return entity;
  },

  async update(id, values) {
    await mockDelay();
    const index = store.findIndex((c) => c.id === id);
    if (index === -1) notFound("Категорія");
    ensureUniqueSlug({ items: store, slug: values.slug, excludeId: id });
    const updated: ProductCategory = {
      ...store[index],
      ...values,
      translations: normalizeTranslations(values),
      name: values.translations.uk.name,
      description: values.translations.uk.description || undefined,
      updatedAt: nowIso(),
    };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((c) => c.id === id);
    if (index === -1) notFound("Категорія");
    store.splice(index, 1);
    persist();
  },
};
