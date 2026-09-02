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
