import type { CalendarQuery, CrudResource } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockCalendarDays } from "@/lib/mock-data/calendar";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { CalendarDay } from "@/types/entities";

const STORE_KEY = "calendarDays";
const store: CalendarDay[] = loadStore(STORE_KEY, mockCalendarDays);
const persist = () => saveStore(STORE_KEY, store);

export const calendarDaysResource: CrudResource<CalendarDay, CalendarDayFormValues, CalendarQuery> = {
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
};
