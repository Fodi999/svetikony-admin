/**
 * The stable BFF contract for Saints. Worker DTO -> BFF DTO here is pure
 * field whitelisting — no semantic decisions (enum fallbacks, null/"" ->
 * undefined). Those belong in lib/api/http/saints.ts's toEntity()/
 * toPayload(), matching the Icons/Calendar Day precedent.
 *
 * Rule: Worker can change. This BFF contract must stay stable. The browser
 * (and HttpApiAdapter) only ever sees BffSaintDto, never the raw Worker row.
 */

/** Mirrors lib/d1/repositories/saints.ts's ChurchSaintDto in svet-ikony
 * exactly (Stage 2L). Do not add fields here that aren't in that type. */
export interface WorkerSaintDto {
  id: string;
  siteId: string;
  iconId: string | null;
  calendarDayId: string | null;
  slug: string;
  name: string;
  shortDescription: string;
  biography: string;
  feastDay: string;
  imageUrl: string;
  language: string;
  translationGroupId: string;
  status: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fields deliberately dropped here and never sent to the browser: `siteId`,
 * `isGlobal` (internal single-tenant/Worker fields with no admin use),
 * `iconId`/`calendarDayId` (the real relation is inverted from the admin's
 * `relatedIconIds`/`relatedCalendarDayIds` — those pick MANY icons/days per
 * saint via a picker, while the Worker only has a single FK each — same
 * deferral as Calendar Day's related* fields in Stage 2H).
 */
export interface BffSaintDto {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  biography: string;
  feastDay: string;
  imageUrl: string;
  language: string;
  translationGroupId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toBffSaintDto(worker: WorkerSaintDto): BffSaintDto {
  return {
    id: worker.id,
    slug: worker.slug,
    name: worker.name,
    shortDescription: worker.shortDescription,
    biography: worker.biography,
    feastDay: worker.feastDay,
    imageUrl: worker.imageUrl,
    language: worker.language,
    translationGroupId: worker.translationGroupId,
    status: worker.status,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffSaintDtoList(workers: WorkerSaintDto[]): BffSaintDto[] {
  return workers.map(toBffSaintDto);
}

/** Admin -> Worker payload for create/update. Same whitelist in reverse —
 * see BffSaintDto's doc comment for what's deliberately never sent. */
export interface WorkerSaintWritePayload {
  slug?: string;
  name?: string;
  shortDescription?: string;
  biography?: string;
  feastDay?: string;
  imageUrl?: string;
  language?: string;
  status?: string;
}
