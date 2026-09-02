import type { ApiClient } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockCalendarDays } from "@/lib/mock-data/calendar";
import type { CalendarAiFillResult, CalendarDay } from "@/types/entities";
import { ApiError } from "@/types/api";

const STORE_KEY = "calendarDays";
const store: CalendarDay[] = loadStore(STORE_KEY, mockCalendarDays);
const persist = () => saveStore(STORE_KEY, store);

function getOrThrow(id: string): CalendarDay {
  const found = store.find((d) => d.id === id);
  if (!found) notFound("Календарний день");
  return found;
}

function save(id: string, patch: Partial<CalendarDay>): CalendarDay {
  const index = store.findIndex((d) => d.id === id);
  if (index === -1) notFound("Календарний день");
  const updated: CalendarDay = { ...store[index], ...patch, updatedAt: nowIso() };
  store[index] = updated;
  persist();
  return updated;
}

export const calendarDaysResource: ApiClient["calendarDays"] = {
  async list(query) {
    await mockDelay();
    let items = [...store];
    if (query?.language) items = items.filter((d) => d.language === query.language);
    if (query?.status) items = items.filter((d) => d.status === query.status);
    if (query?.month) items = items.filter((d) => d.date.startsWith(query.month!));
    items = items.filter((d) => matchesSearch([d.title, d.shortDescription, d.slug], query?.search));
    items.sort((a, b) => a.date.localeCompare(b.date));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((d) => d.id === id);
    if (!found) notFound("Календарний день");
    return found;
  },

  async create(values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const groupId = nextId("cal-grp");
    const entity: CalendarDay = {
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
    const index = store.findIndex((d) => d.id === id);
    if (index === -1) notFound("Календарний день");
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language, excludeId: id });
    const updated: CalendarDay = { ...store[index], ...values, updatedAt: nowIso() };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((d) => d.id === id);
    if (index === -1) notFound("Календарний день");
    store.splice(index, 1);
    persist();
  },

  async createTranslation(groupId, language, values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const entity: CalendarDay = {
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

  async generateDescription(id) {
    await mockDelay(400);
    const day = getOrThrow(id);
    if (day.shortDescription.trim()) throw new ApiError("conflict", "Опис вже існує -- скористайтеся регенерацією");
    return save(id, { shortDescription: `Мок-опис для "${day.title}".` });
  },
  async regenerateDescription(id) {
    await mockDelay(400);
    const day = getOrThrow(id);
    return save(id, { shortDescription: `Новий мок-опис для "${day.title}".` });
  },
  async generateHistory(id) {
    await mockDelay(400);
    const day = getOrThrow(id);
    if (day.history?.trim()) throw new ApiError("conflict", "Текст вже існує -- скористайтеся регенерацією");
    return save(id, { history: `Мок-історична довідка для "${day.title}".` });
  },
  async regenerateHistory(id) {
    await mockDelay(400);
    const day = getOrThrow(id);
    return save(id, { history: `Новий мок-текст для "${day.title}".` });
  },
  async generateSeo(id) {
    await mockDelay(300);
    const day = getOrThrow(id);
    if (day.seoTitle?.trim() && day.seoDescription?.trim()) {
      throw new ApiError("conflict", "SEO title і description вже існують -- скористайтеся регенерацією");
    }
    return save(id, {
      seoTitle: day.seoTitle?.trim() ? day.seoTitle : day.title,
      seoDescription: day.seoDescription?.trim() ? day.seoDescription : `Мок SEO-опис для "${day.title}".`,
    });
  },
  async regenerateSeo(id) {
    await mockDelay(300);
    const day = getOrThrow(id);
    return save(id, { seoTitle: day.title, seoDescription: `Новий мок SEO-опис для "${day.title}".` });
  },
  async generateImage(id) {
    await mockDelay(400);
    const day = getOrThrow(id);
    if (day.imageId?.trim()) throw new ApiError("conflict", "Зображення вже існує -- скористайтеся регенерацією");
    return save(id, { imageId: "https://placehold.co/600x400" });
  },
  async regenerateImage(id) {
    await mockDelay(400);
    getOrThrow(id);
    return save(id, { imageId: `https://placehold.co/600x400?text=${Date.now()}` });
  },
  async assignImage(id, imageUrl) {
    await mockDelay(200);
    getOrThrow(id);
    return save(id, { imageId: imageUrl });
  },
  async fillMissing(id): Promise<CalendarAiFillResult> {
    await mockDelay(800);
    const day = getOrThrow(id);
    const filled: CalendarAiFillResult["filled"] = [];
    let current = day;
    if (!current.shortDescription.trim()) {
      current = save(id, { shortDescription: `Мок-опис для "${current.title}".` });
      filled.push("description");
    }
    if (!current.history?.trim()) {
      current = save(id, { history: `Мок-історична довідка для "${current.title}".` });
      filled.push("history");
    }
    if (!(current.seoTitle?.trim() && current.seoDescription?.trim())) {
      current = save(id, { seoTitle: current.title, seoDescription: `Мок SEO-опис для "${current.title}".` });
      filled.push("seo");
    }
    if (!current.imageId?.trim()) {
      current = save(id, { imageId: "https://placehold.co/600x400" });
      filled.push("image");
    }
    return { day: current, filled, skipped: [] };
  },
};
