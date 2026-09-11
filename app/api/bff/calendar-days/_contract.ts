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

/** Mirrors lib/d1/repositories/calendarDays.ts's CalendarImageMetadata in
 * svet-ikony -- read-only provenance for the Media tab (task: "Media UI"),
 * never sent back on write. */
export interface WorkerCalendarImageMetadata {
  origin: "ai_generated" | "manual";
  referenceProvider?: "wikipedia" | "commons";
  referenceLanguage?: "uk" | "ru" | "en";
  referencePageUrl?: string;
  referenceImageUrl?: string;
  referenceTitle?: string;
  referenceAuthor?: string;
  referenceLicense?: string;
  referenceAttribution?: string;
  wikidataId?: string;
  commonsFileTitle?: string;
  commonsCategory?: string;
  identityVerified: boolean;
  fallbackReason?: string;
  customPrompt?: string;
}

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
  seoTitle: string | null;
  seoDescription: string | null;
  imageMetadata: WorkerCalendarImageMetadata | null;
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
  seoTitle: string | null;
  seoDescription: string | null;
  imageMetadata: WorkerCalendarImageMetadata | null;
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
    seoTitle: worker.seoTitle,
    seoDescription: worker.seoDescription,
    imageMetadata: worker.imageMetadata,
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
  seoTitle?: string | null;
  seoDescription?: string | null;
}

/**
 * Outcome of "Заповнити відсутнє з AI" -- mirrors
 * lib/church/calendar-ai-actions.ts's FillMissingCalendarResult union in
 * svet-ikony. `mode: "direct"` means the day was NEW/DRAFT and missing
 * fields were written straight to it (`day` already reflects them).
 * `mode: "proposal"` means the day was PUBLISHED, so nothing was written;
 * `day` is unchanged, and `proposalId` names the pending ai_proposals row
 * a human must review (null when there was nothing to propose).
 */
export type WorkerCalendarAiField = "description" | "history" | "seo" | "image";
type WorkerCalendarAiSkip = { field: WorkerCalendarAiField; reason: "missing_source" | "review_required" | "failed" };
export type WorkerCalendarAiFillResultDto =
  | { mode: "direct"; day: WorkerCalendarDayDto; filled: WorkerCalendarAiField[]; skipped: WorkerCalendarAiSkip[] }
  | { mode: "proposal"; day: WorkerCalendarDayDto; proposalId: string | null; proposedFields: WorkerCalendarAiField[]; skipped: WorkerCalendarAiSkip[] };
export type BffCalendarAiFillResultDto =
  | { mode: "direct"; day: BffCalendarDayDto; filled: WorkerCalendarAiField[]; skipped: WorkerCalendarAiSkip[] }
  | { mode: "proposal"; day: BffCalendarDayDto; proposalId: string | null; proposedFields: WorkerCalendarAiField[]; skipped: WorkerCalendarAiSkip[] };
export function toBffCalendarAiFillResultDto(worker: WorkerCalendarAiFillResultDto): BffCalendarAiFillResultDto {
  return worker.mode === "direct"
    ? { mode: "direct", day: toBffCalendarDayDto(worker.day), filled: worker.filled, skipped: worker.skipped }
    : { mode: "proposal", day: toBffCalendarDayDto(worker.day), proposalId: worker.proposalId, proposedFields: worker.proposedFields, skipped: worker.skipped };
}

/**
 * Outcome of every generate/regenerate calendar AI action (description/
 * history/SEO/image, including the custom-prompt image variant) -- mirrors
 * lib/church/calendar-ai-actions.ts's CalendarAiActionResult in svet-ikony.
 * `mode: "direct"` -- the day was DRAFT, `day` already reflects the
 * written field(s). `mode: "proposal"` -- the day was PUBLISHED; `day` is
 * the still-unchanged record, and `proposalId` names the pending AI
 * proposal a human must review.
 */
export type WorkerCalendarAiWriteResultDto = { mode: "direct"; day: WorkerCalendarDayDto } | { mode: "proposal"; day: WorkerCalendarDayDto; proposalId: string };
export type BffCalendarAiWriteResultDto = { mode: "direct"; day: BffCalendarDayDto } | { mode: "proposal"; day: BffCalendarDayDto; proposalId: string };
export function toBffCalendarAiWriteResultDto(worker: WorkerCalendarAiWriteResultDto): BffCalendarAiWriteResultDto {
  return worker.mode === "direct"
    ? { mode: "direct", day: toBffCalendarDayDto(worker.day) }
    : { mode: "proposal", day: toBffCalendarDayDto(worker.day), proposalId: worker.proposalId };
}
