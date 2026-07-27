import type { CrudResource } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockCategories } from "@/lib/mock-data/categories";
import type { ProductCategoryFormValues } from "@/lib/validation/category.schema";
import type { ListQuery } from "@/types/api";
import type { ProductCategory } from "@/types/entities";

const STORE_KEY = "categories";
const store: ProductCategory[] = loadStore(STORE_KEY, mockCategories);
const persist = () => saveStore(STORE_KEY, store);

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
    const updated: ProductCategory = { ...store[index], ...values, updatedAt: nowIso() };
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
