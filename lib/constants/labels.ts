import type { Language, PrayerType } from "@/types/entities";

export const LANGUAGE_LABELS: Record<Language, string> = {
  uk: "Українська",
  ru: "Російська",
  en: "English",
};

export const PRAYER_TYPE_LABELS: Record<PrayerType, string> = {
  morning: "Ранкова",
  evening: "Вечірня",
  before_meal: "Перед їжею",
  after_meal: "Після їжі",
  to_saint: "До святого",
  to_icon: "До ікони",
  feast: "Святкова",
  general: "Загальна",
};

export const PARTICLE_COLOR_MODE_LABELS: Record<string, string> = {
  single: "Один колір",
  gradient: "Градієнт",
  theme: "За темою",
};
