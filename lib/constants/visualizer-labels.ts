import type { VisualizerCalendarEra, VisualizerChronologyType, VisualizerEra, VisualizerEventType } from "@/types/entities";

export const VISUALIZER_EVENT_TYPE_LABELS: Record<VisualizerEventType, string> = {
  biblical: "Біблійна подія",
  church_history: "Історія Церкви",
  historical: "Історична подія",
  saint: "Святий",
  council: "Собор",
  location: "Місце",
  other: "Інше",
};

export const VISUALIZER_CHRONOLOGY_TYPE_LABELS: Record<VisualizerChronologyType, string> = {
  exact: "Точна дата",
  approximate: "Приблизна дата",
  traditional: "Традиційне датування",
  period: "Період",
  unknown: "Невідомо",
};

export const VISUALIZER_ERA_LABELS: Record<VisualizerEra, string> = {
  biblical_creation: "Створення світу",
  biblical_old_testament: "Старий Заповіт",
  biblical_new_testament: "Новий Заповіт",
  apostolic: "Апостольська доба",
  early_church: "Рання Церква",
  byzantine: "Візантія",
  medieval: "Середньовіччя",
  modern: "Новий час",
  contemporary: "Сучасність",
  custom: "Інше",
};

export const VISUALIZER_CALENDAR_ERA_LABELS: Record<VisualizerCalendarEra, string> = {
  BC: "до н.е.",
  AD: "н.е.",
  unknown: "Невідомо",
};
