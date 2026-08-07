/**
 * The stable BFF contract for Icons. Worker DTO -> BFF DTO here is pure
 * field whitelisting — no semantic decisions (enum fallbacks, null/"" ->
 * undefined). Those belong in lib/api/http/icons.ts's toEntity()/
 * toPayload(), matching the Calendar Day/Prayers precedent.
 *
 * Rule: Worker can change. This BFF contract must stay stable. The browser
 * (and HttpApiAdapter) only ever sees BffIconDto, never the raw Worker row.
 */

/** Mirrors lib/d1/repositories/icons.ts's ChurchIconDto in svet-ikony
 * exactly (Stage 2K). Do not add fields here that aren't in that type. */
export interface WorkerIconDto {
  id: string;
  siteId: string;
  calendarDayId: string | null;
  title: string;
  slug: string;
  imageUrl: string;
  saintName: string;
  feastName: string;
  description: string;
  language: string;
  translationGroupId: string;
  status: string;
  isGlobal: boolean;
  orderEnabled: boolean;
  orderBlockText: string;
  productionTime: string;
  priceCents: number | null;
  currency: string;
  consecrationAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fields deliberately dropped here and never sent to the browser: `siteId`,
 * `isGlobal` (internal single-tenant/Worker fields with no admin use),
 * `calendarDayId` (the real relation is inverted — see toEntity()'s doc
 * comment in lib/api/http/icons.ts), `saintName`/`feastName` (no admin
 * field maps to these yet — the form's "Опис образу святого" is a long
 * free-text description, not a short name pair), and the icon-ordering
 * fields (`orderEnabled`/`orderBlockText`/`productionTime`/`priceCents`/
 * `currency`/`consecrationAvailable`) — the Worker's update preserves all
 * of these untouched as long as the admin never sends them (see
 * ChurchIconPayload's `?? current.X` fallback pattern).
 */
export interface BffIconDto {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  description: string;
  language: string;
  translationGroupId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toBffIconDto(worker: WorkerIconDto): BffIconDto {
  return {
    id: worker.id,
    title: worker.title,
    slug: worker.slug,
    imageUrl: worker.imageUrl,
    description: worker.description,
    language: worker.language,
    translationGroupId: worker.translationGroupId,
    status: worker.status,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffIconDtoList(workers: WorkerIconDto[]): BffIconDto[] {
  return workers.map(toBffIconDto);
}

/** Admin -> Worker payload for create/update. Same whitelist in reverse —
 * see BffIconDto's doc comment for what's deliberately never sent. */
export interface WorkerIconWritePayload {
  title?: string;
  slug?: string;
  imageUrl?: string;
  description?: string;
  language?: string;
  status?: string;
}
