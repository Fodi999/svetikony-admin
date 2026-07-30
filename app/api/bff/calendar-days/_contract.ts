/**
 * The stable BFF contract for Calendar Days. Worker DTO -> BFF DTO here is
 * pure field whitelisting/renaming — no semantic decisions (enum
 * fallbacks, null/"" -> undefined, date derivation). Those belong in
 * lib/api/http/calendar-days.ts's toEntity()/toPayload(), the one place
 * that makes those calls, matching the Alphabet/Prayers precedent.
 *
 * Rule: Worker can change. This BFF contract must stay stable. The browser
 * (and HttpApiAdapter) only ever sees BffCalendarDayDto, never the raw
 * Worker row.
 */

/** Mirrors lib/d1/repositories/calendarDays.ts's ChurchCalendarDayDto in
 * svet-ikony exactly (Stage 2H). Do not add fields here that aren't in
 * that type. */
export interface WorkerCalendarDayDto {
  id: string;
  siteId: string;
  dateOldStyle: string | null;
  dateNewStyle: string | null;
  calendarType: string;
  title: string;
  slug: string;
  language: string;
  translationGroupId: string;
  dayType: string;
  description: string;
  history: string;
  imageUrl: string;
  rank: number;
  status: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Fields deliberately dropped here and never sent to the browser: `siteId`,
 * `isGlobal` — internal single-tenant/Worker fields with no admin use. */
export interface BffCalendarDayDto {
  id: string;
  dateOldStyle: string | null;
  dateNewStyle: string | null;
  calendarType: string;
  title: string;
  slug: string;
  language: string;
  translationGroupId: string;
  dayType: string;
  description: string;
  history: string;
  imageUrl: string;
  rank: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toBffCalendarDayDto(worker: WorkerCalendarDayDto): BffCalendarDayDto {
  return {
    id: worker.id,
    dateOldStyle: worker.dateOldStyle,
    dateNewStyle: worker.dateNewStyle,
    calendarType: worker.calendarType,
    title: worker.title,
    slug: worker.slug,
    language: worker.language,
    translationGroupId: worker.translationGroupId,
    dayType: worker.dayType,
    description: worker.description,
    history: worker.history,
    imageUrl: worker.imageUrl,
    rank: worker.rank,
    status: worker.status,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffCalendarDayDtoList(workers: WorkerCalendarDayDto[]): BffCalendarDayDto[] {
  return workers.map(toBffCalendarDayDto);
}

/** Admin -> Worker payload for create/update. Same whitelist in reverse:
 * only fields the Worker's ChurchCalendarDayPayload actually accepts. */
export interface WorkerCalendarDayWritePayload {
  dateOldStyle?: string | null;
  dateNewStyle?: string | null;
  calendarType?: string;
  title?: string;
  slug?: string;
  language?: string;
  dayType?: string;
  description?: string;
  history?: string;
  imageUrl?: string;
  rank?: number;
  status?: string;
}
