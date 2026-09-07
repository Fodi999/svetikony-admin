/**
 * The stable BFF contract for Gospel readings. Worker DTO -> BFF DTO here
 * is pure field whitelisting — no semantic decisions (enum fallbacks,
 * null/"" -> undefined). Those belong in lib/api/http/gospel.ts's
 * toEntity()/toPayload(), matching the Articles/Saints precedent.
 *
 * Rule: Worker can change. This BFF contract must stay stable. The browser
 * (and HttpApiAdapter) only ever sees BffGospelDto, never the raw Worker row.
 */

/** Mirrors svet-ikony's lib/d1/repositories/gospel.ts's ChurchGospelDto
 * exactly (Phase 2B-3). Do not add fields here that aren't in that type —
 * in particular, there is no translationGroupId and no image/cover column,
 * same as Articles (verified directly against the migration and
 * repository, not assumed — Gospel is NOT identical to Articles, but this
 * particular gap is). */
export interface WorkerGospelDto {
  id: string;
  siteId: string;
  iconId: string | null;
  calendarDayId: string | null;
  slug: string;
  title: string;
  reference: string;
  text: string;
  explanation: string;
  language: string;
  status: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Same treatment as Articles' iconId: `calendarDayId` IS forwarded here
 * (unlike Saints, which drops its singular relation fields entirely) —
 * it's a real column the admin form now edits as a single relation (see
 * lib/api/http/gospel.ts), replacing the old plural relatedCalendarDayIds
 * picker the mock/UI used to expose. `iconId` is equally real but not yet
 * exposed by any admin field; left in the contract for forward
 * compatibility, unused today (same as Articles' calendarDayId). Dropped:
 * `siteId`, `isGlobal` (internal, no admin use).
 */
export interface BffGospelDto {
  id: string;
  iconId: string | null;
  calendarDayId: string | null;
  slug: string;
  title: string;
  reference: string;
  text: string;
  explanation: string;
  language: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toBffGospelDto(worker: WorkerGospelDto): BffGospelDto {
  return {
    id: worker.id,
    iconId: worker.iconId,
    calendarDayId: worker.calendarDayId,
    slug: worker.slug,
    title: worker.title,
    reference: worker.reference,
    text: worker.text,
    explanation: worker.explanation,
    language: worker.language,
    status: worker.status,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffGospelDtoList(workers: WorkerGospelDto[]): BffGospelDto[] {
  return workers.map(toBffGospelDto);
}

/** Admin -> Worker payload for create/update. Same whitelist in reverse —
 * see BffGospelDto's doc comment. Nothing here is dropped: every field the
 * admin form edits has a real column to write to. */
export interface WorkerGospelWritePayload {
  iconId?: string | null;
  calendarDayId?: string | null;
  slug?: string;
  title?: string;
  reference?: string;
  text?: string;
  explanation?: string;
  language?: string;
  status?: string;
}
