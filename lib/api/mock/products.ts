import type { CrudResource, ProductQuery } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockProducts } from "@/lib/mock-data/products";
import type { ProductFormValues } from "@/lib/validation/product.schema";
import type { Product } from "@/types/entities";

const STORE_KEY = "products";
const store: Product[] = loadStore(STORE_KEY, mockProducts);
const persist = () => saveStore(STORE_KEY, store);

export const productsResource: CrudResource<Product, ProductFormValues, ProductQuery> = {
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
    const updated: Product = { ...store[index], ...values, updatedAt: nowIso() };
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
};
