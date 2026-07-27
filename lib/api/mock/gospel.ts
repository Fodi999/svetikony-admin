import type { CrudResource, TranslatableQuery } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockGospelReadings } from "@/lib/mock-data/gospel";
import type { GospelReadingFormValues } from "@/lib/validation/gospel.schema";
import type { GospelReading } from "@/types/entities";

const STORE_KEY = "gospelReadings";
const store: GospelReading[] = loadStore(STORE_KEY, mockGospelReadings);
const persist = () => saveStore(STORE_KEY, store);

export const gospelReadingsResource: CrudResource<GospelReading, GospelReadingFormValues, TranslatableQuery> = {
  async list(query) {
    await mockDelay();
    let items = [...store];
    if (query?.language) items = items.filter((g) => g.language === query.language);
    if (query?.status) items = items.filter((g) => g.status === query.status);
    items = items.filter((g) => matchesSearch([g.title, g.reference, g.slug], query?.search));
    items.sort((a, b) => a.title.localeCompare(b.title));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((g) => g.id === id);
    if (!found) notFound("Євангельське читання");
    return found;
  },

  async create(values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const groupId = nextId("gospel-grp");
    const entity: GospelReading = {
      id: `${groupId}-${values.language}`,
      translationGroupId: groupId,
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
    const index = store.findIndex((g) => g.id === id);
    if (index === -1) notFound("Євангельське читання");
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language, excludeId: id });
    const updated: GospelReading = { ...store[index], ...values, updatedAt: nowIso() };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((g) => g.id === id);
    if (index === -1) notFound("Євангельське читання");
    store.splice(index, 1);
    persist();
  },

  async createTranslation(groupId, language, values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const entity: GospelReading = {
      id: `${groupId}-${language}`,
      translationGroupId: groupId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...values,
    };
    store.push(entity);
    persist();
    return entity;
  },
};
