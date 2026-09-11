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
  feastDayOldStyle: string;
  feastDayNewStyle: string;
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
 * `iconId` (the admin's `relatedIconIds` picks MANY icons per saint via a
 * picker, while the Worker only has a single FK — same deferral as Calendar
 * Day's related* fields in Stage 2H). `calendarDayId` IS forwarded (same
 * treatment as Prayers/Gospel's own calendarDayId) — it's the real,
 * singular relation the Worker actually has.
 */
export interface BffSaintDto {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  biography: string;
  feastDayOldStyle: string;
  feastDayNewStyle: string;
  imageUrl: string;
  language: string;
  translationGroupId: string;
  status: string;
  calendarDayId: string | null;
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
    feastDayOldStyle: worker.feastDayOldStyle,
    feastDayNewStyle: worker.feastDayNewStyle,
    imageUrl: worker.imageUrl,
    language: worker.language,
    translationGroupId: worker.translationGroupId,
    status: worker.status,
    calendarDayId: worker.calendarDayId,
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
  feastDayOldStyle?: string;
  feastDayNewStyle?: string;
  imageUrl?: string;
  language?: string;
  status?: string;
  calendarDayId?: string | null;
}
