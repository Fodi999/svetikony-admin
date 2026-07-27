import type { CrudResource, TranslatableQuery } from "@/lib/api/client";
import { loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockPrayers } from "@/lib/mock-data/prayers";
import type { PrayerFormValues } from "@/lib/validation/prayer.schema";
import type { Prayer } from "@/types/entities";

const STORE_KEY = "prayers";
const store: Prayer[] = loadStore(STORE_KEY, mockPrayers);
const persist = () => saveStore(STORE_KEY, store);

export const prayersResource: CrudResource<Prayer, PrayerFormValues, TranslatableQuery> = {
  async list(query) {
    await mockDelay();
    let items = [...store];
    if (query?.language) items = items.filter((p) => p.language === query.language);
    if (query?.status) items = items.filter((p) => p.status === query.status);
    items = items.filter((p) => matchesSearch([p.title, p.text, p.slug], query?.search));
    items.sort((a, b) => a.title.localeCompare(b.title));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((p) => p.id === id);
    if (!found) notFound("Молитва");
    return found;
  },

  async create(values) {
    await mockDelay();
    const entity: Prayer = {
      id: nextId("prayer"),
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
    if (index === -1) notFound("Молитва");
    const updated: Prayer = { ...store[index], ...values, updatedAt: nowIso() };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((p) => p.id === id);
    if (index === -1) notFound("Молитва");
    store.splice(index, 1);
    persist();
  },
};
