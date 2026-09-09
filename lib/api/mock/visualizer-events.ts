import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockVisualizerEvents } from "@/lib/mock-data/visualizer-events";
import type { VisualizerEvent } from "@/types/entities";

const STORE_KEY = "visualizerEvents";
const store: VisualizerEvent[] = loadStore(STORE_KEY, mockVisualizerEvents);
const persist = () => saveStore(STORE_KEY, store);

export const visualizerEventsResource: ApiClient["visualizerEvents"] = {
  async list(query?: TranslatableQuery) {
    await mockDelay();
    let items = [...store];
    if (query?.language) items = items.filter((e) => e.language === query.language);
    if (query?.status) items = items.filter((e) => e.status === query.status);
    items = items.filter((e) => matchesSearch([e.title, e.slug, e.locationName], query?.search));
    items.sort((a, b) => (a.yearStart ?? 0) - (b.yearStart ?? 0));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((e) => e.id === id);
    if (!found) notFound("Подія");
    return found;
  },

  async create(values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const groupId = nextId("visualizer-grp");
    const entity: VisualizerEvent = {
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
    const index = store.findIndex((e) => e.id === id);
    if (index === -1) notFound("Подія");
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language, excludeId: id });
    const updated: VisualizerEvent = { ...store[index], ...values, updatedAt: nowIso() };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((e) => e.id === id);
    if (index === -1) notFound("Подія");
    store.splice(index, 1);
    persist();
  },

  async createTranslation(groupId, language, values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const entity: VisualizerEvent = {
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
