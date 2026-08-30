/**
 * Trimmed to exactly the fields the "Сьогодні" tab displays — the Worker's
 * getTodayContentForAdmin() returns full ChurchCalendarDayDto/ChurchSaintDto/
 * etc. shapes (translationGroupId, status, isGlobal, ...), none of which
 * this read-only preview needs or should leak.
 */
export interface WorkerTelegramTodayDto {
  calendarDay: { id: string; title: string; description: string } | null;
  saint: { id: string; name: string; shortDescription: string } | null;
  prayer: { id: string; title: string; text: string } | null;
  gospel: { id: string; title: string; reference: string; text: string } | null;
  article: { id: string; title: string; content: string } | null;
  imageUrl: string | null;
}

export type BffTelegramTodayDto = WorkerTelegramTodayDto;

export function toBffTelegramTodayDto(worker: WorkerTelegramTodayDto): BffTelegramTodayDto {
  return {
    calendarDay: worker.calendarDay ? { id: worker.calendarDay.id, title: worker.calendarDay.title, description: worker.calendarDay.description } : null,
    saint: worker.saint ? { id: worker.saint.id, name: worker.saint.name, shortDescription: worker.saint.shortDescription } : null,
    prayer: worker.prayer ? { id: worker.prayer.id, title: worker.prayer.title, text: worker.prayer.text } : null,
    gospel: worker.gospel
      ? { id: worker.gospel.id, title: worker.gospel.title, reference: worker.gospel.reference, text: worker.gospel.text }
      : null,
    article: worker.article ? { id: worker.article.id, title: worker.article.title, content: worker.article.content } : null,
    imageUrl: worker.imageUrl,
  };
}
