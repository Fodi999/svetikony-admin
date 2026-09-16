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
  galleryUrls: string[];
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
  history: string | null;
  saintImageDescription: string | null;
  materials: string | null;
  dimensions: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fields deliberately dropped here and never sent to the browser: `siteId`,
 * `isGlobal` (internal single-tenant/Worker fields with no admin use),
 * `saintName`/`feastName` (no admin field maps to these yet — the form's
 * "Опис образу святого" is a long free-text description, not a short name
 * pair), and the icon-ordering fields (`orderEnabled`/`orderBlockText`/
 * `productionTime`/`priceCents`/`currency`/`consecrationAvailable`) — the
 * Worker's update preserves all of these untouched as long as the admin
 * never sends them (see ChurchIconPayload's `?? current.X` fallback
 * pattern). `calendarDayId` IS forwarded (same treatment as Prayers/
 * Gospel's own calendarDayId) — it's the real, singular relation the
 * Worker actually has; the admin no longer pretends this is a many-valued
 * `relatedCalendarDayIds` picker. `history`/`saintImageDescription`/
 * `materials`/`dimensions` (migration 0024) ARE forwarded now — the admin
 * form has always had inputs for these; they previously vanished on save
 * because nothing round-tripped them past this contract.
 */
export interface BffIconDto {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  galleryUrls: string[];
  description: string;
  language: string;
  translationGroupId: string;
  status: string;
  calendarDayId: string | null;
  history: string | null;
  saintImageDescription: string | null;
  materials: string | null;
  dimensions: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toBffIconDto(worker: WorkerIconDto): BffIconDto {
  return {
    id: worker.id,
    title: worker.title,
    slug: worker.slug,
    imageUrl: worker.imageUrl,
    galleryUrls: worker.galleryUrls,
    description: worker.description,
    language: worker.language,
    translationGroupId: worker.translationGroupId,
    status: worker.status,
    calendarDayId: worker.calendarDayId,
    history: worker.history,
    saintImageDescription: worker.saintImageDescription,
    materials: worker.materials,
    dimensions: worker.dimensions,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffIconDtoList(workers: WorkerIconDto[]): BffIconDto[] {
  return workers.map(toBffIconDto);
}

/**
 * Outcome of "Заповнити відсутнє з AI" for an Icon -- mirrors Calendar
 * Day's WorkerCalendarAiFillResultDto/BffCalendarAiFillResultDto exactly,
 * minus "seo"/"image" (icons have neither yet). See
 * lib/church/icon-ai-actions.ts's FillMissingIconResult in svet-ikony.
 */
export type WorkerIconAiField = "description" | "history" | "saintImageDescription";
type WorkerIconAiSkip = { field: WorkerIconAiField; reason: "failed" };
export type WorkerIconAiFillResultDto =
  | { mode: "direct"; icon: WorkerIconDto; filled: WorkerIconAiField[]; skipped: WorkerIconAiSkip[] }
  | { mode: "proposal"; icon: WorkerIconDto; proposalId: string | null; proposedFields: WorkerIconAiField[]; skipped: WorkerIconAiSkip[] };
export type BffIconAiFillResultDto =
  | { mode: "direct"; icon: BffIconDto; filled: WorkerIconAiField[]; skipped: WorkerIconAiSkip[] }
  | { mode: "proposal"; icon: BffIconDto; proposalId: string | null; proposedFields: WorkerIconAiField[]; skipped: WorkerIconAiSkip[] };
export function toBffIconAiFillResultDto(worker: WorkerIconAiFillResultDto): BffIconAiFillResultDto {
  return worker.mode === "direct"
    ? { mode: "direct", icon: toBffIconDto(worker.icon), filled: worker.filled, skipped: worker.skipped }
    : { mode: "proposal", icon: toBffIconDto(worker.icon), proposalId: worker.proposalId, proposedFields: worker.proposedFields, skipped: worker.skipped };
}

/**
 * Outcome of every generate/regenerate Icon AI action (description/
 * history/saint-image description). Mirrors Calendar Day's
 * WorkerCalendarAiWriteResultDto/BffCalendarAiWriteResultDto exactly.
 */
export type WorkerIconAiWriteResultDto = { mode: "direct"; icon: WorkerIconDto } | { mode: "proposal"; icon: WorkerIconDto; proposalId: string };
export type BffIconAiWriteResultDto = { mode: "direct"; icon: BffIconDto } | { mode: "proposal"; icon: BffIconDto; proposalId: string };
export function toBffIconAiWriteResultDto(worker: WorkerIconAiWriteResultDto): BffIconAiWriteResultDto {
  return worker.mode === "direct"
    ? { mode: "direct", icon: toBffIconDto(worker.icon) }
    : { mode: "proposal", icon: toBffIconDto(worker.icon), proposalId: worker.proposalId };
}

/** Admin -> Worker payload for create/update. Same whitelist in reverse —
 * see BffIconDto's doc comment for what's deliberately never sent. */
export interface WorkerIconWritePayload {
  title?: string;
  slug?: string;
  imageUrl?: string;
  galleryUrls?: string[];
  description?: string;
  language?: string;
  status?: string;
  calendarDayId?: string | null;
  history?: string | null;
  saintImageDescription?: string | null;
  materials?: string | null;
  dimensions?: string | null;
}
