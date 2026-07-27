import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockAlphabetLetters } from "@/lib/mock-data/alphabet";
import type { AlphabetLetter } from "@/types/entities";

const STORE_KEY = "alphabetLetters";
const store: AlphabetLetter[] = loadStore(STORE_KEY, mockAlphabetLetters);
const persist = () => saveStore(STORE_KEY, store);

export const alphabetLettersResource: ApiClient["alphabetLetters"] = {
  async list(query?: TranslatableQuery) {
    await mockDelay();
    let items = [...store];
    if (query?.language) items = items.filter((l) => l.language === query.language);
    items = items.filter((l) => matchesSearch([l.name, l.slug, l.pronunciation], query?.search));
    items.sort((a, b) => a.order - b.order);
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((l) => l.id === id);
    if (!found) notFound("Буква");
    return found;
  },

  async create(values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const groupId = nextId("letter-grp");
    const entity: AlphabetLetter = {
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
    const index = store.findIndex((l) => l.id === id);
    if (index === -1) notFound("Буква");
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language, excludeId: id });
    const updated: AlphabetLetter = { ...store[index], ...values, updatedAt: nowIso() };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((l) => l.id === id);
    if (index === -1) notFound("Буква");
    store.splice(index, 1);
    persist();
  },

  async createTranslation(groupId, language, values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const entity: AlphabetLetter = {
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

  async reorderGroups(orderedGroupIds) {
    await mockDelay(150);
    orderedGroupIds.forEach((groupId, index) => {
      store
        .filter((l) => l.translationGroupId === groupId)
        .forEach((letter) => {
          letter.order = index;
          letter.updatedAt = nowIso();
        });
    });
    persist();
  },
};
