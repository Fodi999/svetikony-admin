import type { CrudResource, TranslatableQuery } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockSaints } from "@/lib/mock-data/saints";
import type { SaintFormValues } from "@/lib/validation/saint.schema";
import type { Saint } from "@/types/entities";

const STORE_KEY = "saints";
const store: Saint[] = loadStore(STORE_KEY, mockSaints);
const persist = () => saveStore(STORE_KEY, store);

export const saintsResource: CrudResource<Saint, SaintFormValues, TranslatableQuery> = {
  async list(query) {
    await mockDelay();
    let items = [...store];
    if (query?.language) items = items.filter((s) => s.language === query.language);
    if (query?.status) items = items.filter((s) => s.status === query.status);
    items = items.filter((s) => matchesSearch([s.name, s.shortDescription, s.slug], query?.search));
    items.sort((a, b) => a.name.localeCompare(b.name));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((s) => s.id === id);
    if (!found) notFound("Святий");
    return found;
  },

  async create(values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const groupId = nextId("saint-grp");
    const entity: Saint = {
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
    const index = store.findIndex((s) => s.id === id);
    if (index === -1) notFound("Святий");
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language, excludeId: id });
    const updated: Saint = { ...store[index], ...values, updatedAt: nowIso() };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((s) => s.id === id);
    if (index === -1) notFound("Святий");
    store.splice(index, 1);
    persist();
  },

  async createTranslation(groupId, language, values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const entity: Saint = {
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
