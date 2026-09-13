import { apiClient } from "@/lib/api";
import { httpPost } from "@/lib/api/http/transport";
import { calendarDaySchema, type CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { Language } from "@/types/entities";

/** Sequential, resumable by persisted translations; no implicit publication. */
export async function prepareCalendarLanguages(date: string, preferred: Language, groupId: string | undefined, progress: (value: string) => void) {
  const languages: Language[] = ["uk", "ru", "en"];
  const existing = await apiClient.calendarDays.list({ pageSize: 500, month: date.slice(0, 7) });
  const atDate = existing.items.filter((day) => day.date === date);
  const groups = new Set(atDate.map((day) => day.translationGroupId));
  if (!groupId && groups.size > 1) throw new Error("Для цієї дати є кілька матеріалів. Відкрийте потрібний запис і його переклад.");
  const days = atDate.filter((day) => !groupId || day.translationGroupId === groupId);
  let base = days.find((day) => day.language === "uk") ?? days[0];
  for (const language of languages) {
    if (days.some((day) => day.language === language)) continue;
    progress(`Текст і SEO · ${language.toUpperCase()}…`);
    const prepared = await httpPost<CalendarDayFormValues & { sourceUrl: string }>("/api/bff/calendar-days/prepare-date", { date, language }, 105_000);
    const label = language === "en" ? "Source (fixed commemorations)" : language === "ru" ? "Источник (неподвижные памяти)" : "Джерело (нерухомі пам’яті)";
    const values = calendarDaySchema.parse({ ...prepared, date, language, slug: base?.slug || prepared.slug, status: "draft", history: `${prepared.history}\n\n${label}: ${prepared.sourceUrl}` });
    const created = base
      ? await apiClient.calendarDays.createTranslation!(base.translationGroupId, language, values)
      : await apiClient.calendarDays.create(values);
    if (base && created.translationGroupId !== base.translationGroupId) throw new Error("Переклад збережено, але зв’язок мов потребує перевірки. Повторну генерацію зупинено.");
    base ??= created;
    days.push(created);
  }
  if (!base) throw new Error("Не вдалося створити календарний день");
  let imageSource = days.find((day) => day.imageId);
  if (!imageSource) {
    const draft = days.find((day) => day.status === "draft");
    if (!draft) throw new Error("Тексти існують. Для спільного фото відкрийте чернетку; опубліковані записи не змінено.");
    progress("Одне спільне AI-фото · UK/RU/EN…");
    try {
      const result = await apiClient.calendarDays.generateImage(draft.id);
      if (result.mode !== "direct" || !result.day.imageId) throw new Error("Image missing");
      imageSource = result.day;
    } catch {
      throw new Error("Тексти UK/RU/EN збережено. Фото не згенеровано — повторіть підготовку, тексти повторно не генеруватимуться.");
    }
  }
  for (const day of days) {
    if (day.id === imageSource.id || day.imageId || day.status !== "draft") continue;
    progress(`Прикріплення спільного фото · ${day.language.toUpperCase()}…`);
    await httpPost(`/api/bff/calendar-days/${encodeURIComponent(day.id)}/share-image`, { sourceId: imageSource.id });
  }
  return (days.find((day) => day.language === preferred) ?? base).id;
}
