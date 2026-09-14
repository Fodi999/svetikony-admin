import type { CalendarDay } from "@/types/entities";

/** Derived, UI-only "is this day ready" state -- never a DB status, never
 * persisted. Recomputed from whatever fields the already-loaded CalendarDay
 * carries (task: "Не вводить новые DB statuses. Это только derived UI
 * state."). */
export interface CalendarDayStatusFlags {
  basic: boolean;
  content: boolean;
  photo: boolean;
  published: boolean;
}

export function calendarDayStatusFlags(day: CalendarDay): CalendarDayStatusFlags {
  return {
    basic: Boolean(day.title?.trim() && day.date && day.eventType && day.language),
    content: Boolean(day.shortDescription?.trim() || day.history?.trim()),
    photo: Boolean(day.imageId),
    published: day.status === "published",
  };
}

/** Shape shared by both a saved CalendarDay and an in-progress
 * CalendarDayFormValues -- lets the same completeness check run against
 * a live form (before save) or an already-fetched sibling translation
 * (after save), without importing the form-values type here. */
type CompletenessSource = {
  title?: string | null;
  shortDescription?: string | null;
  history?: string | null;
  imageId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

/** Per-field weights for the one-translation completeness percentage --
 * finer-grained than calendarDayStatusFlags' basic/content/photo dots
 * above (that "content" flag is satisfied by EITHER shortDescription OR
 * history; here each field counts on its own, so two translations that
 * both pass "content" can still show different percentages). */
export const COMPLETENESS_FIELDS: { key: keyof CompletenessSource; label: string }[] = [
  { key: "title", label: "Заголовок" },
  { key: "shortDescription", label: "Короткий опис" },
  { key: "history", label: "Історична довідка" },
  { key: "imageId", label: "Фото" },
  { key: "seoTitle", label: "SEO title" },
  { key: "seoDescription", label: "SEO description" },
];

function isFilled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** 0-100, rounded to the nearest whole percent. `undefined` (no sibling
 * translation exists at all yet) counts as 0%, not "not applicable". */
export function calendarDayCompletenessPercent(source: CompletenessSource | undefined): number {
  if (!source) return 0;
  const filled = COMPLETENESS_FIELDS.filter(({ key }) => isFilled(source[key])).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

/** Labels for whichever fields are still empty -- for a pre-publish
 * warning that names what's missing instead of just showing a number. */
export function calendarDayMissingFieldLabels(source: CompletenessSource | undefined): string[] {
  const fields = source ? COMPLETENESS_FIELDS.filter(({ key }) => !isFilled(source[key])) : COMPLETENESS_FIELDS;
  return fields.map((field) => field.label);
}

export const STATUS_DOTS: {
  key: keyof CalendarDayStatusFlags;
  label: string;
  filledTooltip: string;
  emptyTooltip: string;
}[] = [
  { key: "basic", label: "Основне", filledTooltip: "Основне заповнено", emptyTooltip: "Основне не заповнено" },
  { key: "content", label: "Контент", filledTooltip: "Контент заповнено", emptyTooltip: "Контент не заповнено" },
  { key: "photo", label: "Фото", filledTooltip: "Фото додано", emptyTooltip: "Фото не додано" },
  { key: "published", label: "Опубліковано", filledTooltip: "Опубліковано", emptyTooltip: "Не опубліковано" },
];
