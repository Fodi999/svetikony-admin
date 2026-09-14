import type { CalendarDay, CalendarEventType, Language } from "@/types/entities";

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

/**
 * The broader "Готовність дня" score for the admin UX redesign's header/
 * status-cards/publication-checklist/AI-panel -- deliberately a SEPARATE,
 * still-rule-based score from calendarDayCompletenessPercent above (which
 * stays exactly as-is for its own existing consumers: the month-grid cell
 * and the per-language translation bars). That one only ever looks at a
 * single translation's own 6 fields; this one also accounts for relations
 * (saint/prayer/gospel/image) and cross-language translation coverage --
 * the dimensions the redesign's mockup checklist actually names ("Не
 * вистачає: переклад EN, SEO-опис"). Equal-weight, deterministic, no AI
 * involved in computing it (task: "Do NOT let AI invent the percentage.
 * The score must be based on explicit rules").
 */
export type ReadinessState = "ready" | "partial" | "missing" | "n/a";

export interface ReadinessItem {
  key: string;
  label: string;
  state: ReadinessState;
}

export interface CalendarDayReadiness {
  percent: number;
  items: ReadinessItem[];
}

/** Only feast/memorial days plausibly commemorate a specific person --
 * civil/fast/liturgical days routinely have no saint to link, so scoring
 * a missing saint there would just permanently cap those days below
 * 100% for no fixable reason. */
const EVENT_TYPES_WITH_SAINT: ReadonlySet<CalendarEventType> = new Set(["feast", "memorial"]);

const TRANSLATION_LANGUAGES: { key: Language; label: string }[] = [
  { key: "uk", label: "Переклад UK" },
  { key: "ru", label: "Переклад RU" },
  { key: "en", label: "Переклад EN" },
];

export interface CalendarDayReadinessInput {
  day: CompletenessSource & { eventType?: CalendarEventType };
  hasSaint: boolean;
  hasPrayer: boolean;
  hasGospel: boolean;
  /** Per-language state of the translation group this day belongs to --
   * "ready" means a sibling (or this record itself) exists with both
   * title and shortDescription filled; "partial" means a sibling record
   * exists but is still incomplete; "missing" means no sibling at all. */
  translations: Record<Language, "ready" | "partial" | "missing">;
}

function contentState(day: CompletenessSource): ReadinessState {
  const filled = [day.title, day.shortDescription, day.history].filter(isFilled).length;
  return filled === 3 ? "ready" : filled === 0 ? "missing" : "partial";
}

export function calendarDayReadiness(input: CalendarDayReadinessInput): CalendarDayReadiness {
  const { day, hasSaint, hasPrayer, hasGospel, translations } = input;

  const items: ReadinessItem[] = [
    { key: "content", label: "Основний контент", state: contentState(day) },
    {
      key: "saint",
      label: "Святий",
      state: day.eventType && !EVENT_TYPES_WITH_SAINT.has(day.eventType) ? "n/a" : hasSaint ? "ready" : "missing",
    },
    { key: "prayer", label: "Молитва", state: hasPrayer ? "ready" : "missing" },
    { key: "gospel", label: "Євангеліє", state: hasGospel ? "ready" : "missing" },
    { key: "image", label: "Фото", state: isFilled(day.imageId) ? "ready" : "missing" },
    ...TRANSLATION_LANGUAGES.map(({ key, label }) => ({ key: `translation_${key}`, label, state: translations[key] })),
    { key: "seo", label: "SEO", state: isFilled(day.seoTitle) && isFilled(day.seoDescription) ? "ready" : "missing" },
  ];

  const applicable = items.filter((item) => item.state !== "n/a");
  const readyWeight = applicable.reduce((sum, item) => sum + (item.state === "ready" ? 1 : item.state === "partial" ? 0.5 : 0), 0);
  const percent = applicable.length === 0 ? 100 : Math.round((readyWeight / applicable.length) * 100);

  return { percent, items };
}

/** Labels of whichever readiness items are not "ready" (partial, missing,
 * or -- never for n/a, which is excluded entirely) -- the header's "Не
 * вистачає: …" text and the publication checklist's blocker list. */
export function calendarDayReadinessGaps(readiness: CalendarDayReadiness): string[] {
  return readiness.items.filter((item) => item.state === "missing" || item.state === "partial").map((item) => item.label);
}

export interface LinkedEntityRef {
  id: string;
  language?: string;
}

export interface LinkIssue {
  severity: "warning" | "info";
  message: string;
}

/**
 * "AI перевірити зв'язки" (task section 12) -- despite the AI-sounding
 * label, every check here is a plain structural comparison against data
 * the form already has loaded (no model call, no ID this function itself
 * invents): a duplicate link, a language mismatch between the day and a
 * linked record, or nothing linked at all. AI is never asked to pick or
 * write a relation here -- the existing recommendPrayer action (a
 * separate, already-shipped call) is the only model-backed step in this
 * whole flow, and it only ever returns an id that must exist in the
 * caller-supplied candidate list.
 */
export function validateCalendarDayLinks(input: {
  language: string;
  prayers: LinkedEntityRef[];
  gospel: LinkedEntityRef[];
  saints: LinkedEntityRef[];
}): LinkIssue[] {
  const issues: LinkIssue[] = [];

  const checkGroup = (label: string, items: LinkedEntityRef[]) => {
    if (items.length > 1) issues.push({ severity: "warning", message: `${label}: пов'язано кілька записів (${items.length}) -- перевірте, чи це очікувано.` });
    for (const item of items) {
      if (item.language && item.language !== input.language) {
        issues.push({ severity: "warning", message: `${label}: пов'язаний запис іншою мовою (${item.language.toUpperCase()}), ніж день (${input.language.toUpperCase()}).` });
      }
    }
  };

  checkGroup("Молитва", input.prayers);
  checkGroup("Євангеліє", input.gospel);
  checkGroup("Святий", input.saints);

  if (!input.prayers.length) issues.push({ severity: "info", message: "Молитва ще не пов'язана." });
  if (!input.gospel.length) issues.push({ severity: "info", message: "Євангельське читання ще не пов'язане." });

  return issues;
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
