import type { CrudResource, TranslatableQuery } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockArticles } from "@/lib/mock-data/articles";
import type { ArticleFormValues } from "@/lib/validation/article.schema";
import type { Article } from "@/types/entities";

const STORE_KEY = "articles";
const store: Article[] = loadStore(STORE_KEY, mockArticles);
const persist = () => saveStore(STORE_KEY, store);

export const articlesResource: CrudResource<Article, ArticleFormValues, TranslatableQuery> = {
  async list(query) {
    await mockDelay();
    let items = [...store];
    if (query?.language) items = items.filter((a) => a.language === query.language);
    if (query?.status) items = items.filter((a) => a.status === query.status);
    items = items.filter((a) => matchesSearch([a.title, a.slug], query?.search));
    items.sort((a, b) => a.title.localeCompare(b.title));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((a) => a.id === id);
    if (!found) notFound("Стаття");
    return found;
  },

  async create(values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const groupId = nextId("article-grp");
    const entity: Article = {
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
    const index = store.findIndex((a) => a.id === id);
    if (index === -1) notFound("Стаття");
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language, excludeId: id });
    const updated: Article = { ...store[index], ...values, updatedAt: nowIso() };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((a) => a.id === id);
    if (index === -1) notFound("Стаття");
    store.splice(index, 1);
    persist();
  },

  async createTranslation(groupId, language, values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const entity: Article = {
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
