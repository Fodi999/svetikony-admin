import type { CrudResource, TranslatableQuery } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockIcons } from "@/lib/mock-data/icons";
import type { IconFormValues } from "@/lib/validation/icon.schema";
import type { Icon } from "@/types/entities";

const STORE_KEY = "icons";
const store: Icon[] = loadStore(STORE_KEY, mockIcons);
const persist = () => saveStore(STORE_KEY, store);

export const iconsResource: CrudResource<Icon, IconFormValues, TranslatableQuery> = {
  async list(query) {
    await mockDelay();
    let items = [...store];
    if (query?.language) items = items.filter((i) => i.language === query.language);
    if (query?.status) items = items.filter((i) => i.status === query.status);
    items = items.filter((i) => matchesSearch([i.title, i.description, i.slug], query?.search));
    items.sort((a, b) => a.title.localeCompare(b.title));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((i) => i.id === id);
    if (!found) notFound("Ікона");
    return found;
  },

  async create(values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const groupId = nextId("icon-grp");
    const entity: Icon = {
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
    const index = store.findIndex((i) => i.id === id);
    if (index === -1) notFound("Ікона");
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language, excludeId: id });
    const updated: Icon = { ...store[index], ...values, updatedAt: nowIso() };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((i) => i.id === id);
    if (index === -1) notFound("Ікона");
    store.splice(index, 1);
    persist();
  },

  async createTranslation(groupId, language, values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const entity: Icon = {
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
