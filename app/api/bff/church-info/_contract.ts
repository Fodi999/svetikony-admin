/**
 * The stable BFF contract for Church Info — a singleton, not a
 * collection: there is no `[id]` route because svet-ikony's real backend
 * has none either (GET/PUT only, on the collection path itself — see
 * lib/d1/repositories/churchInfo.ts's getChurchInfo()/putChurchInfo(),
 * which resolve "the one row" internally, never by an id the caller
 * supplies).
 *
 * Worker DTO -> BFF DTO here is pure field whitelisting — no semantic
 * decisions. Those belong in lib/api/http/church-info.ts's toEntity()/
 * toPayload().
 */

/** Mirrors svet-ikony's lib/d1/repositories/churchInfo.ts's ChurchInfoDto
 * exactly (Phase 2B-4). `translations` is untyped JSON on the Worker side
 * (`Record<string, unknown>`) — this BFF contract narrows it to the real
 * shape the public site actually reads (see svet-ikony's lib/types.ts's
 * ChurchInfoTranslation: title/description/schedule/dedication/shrines/
 * priest), since that's the one true schema this data must conform to
 * even though the Worker itself doesn't enforce it. */
export interface WorkerChurchInfoTranslation {
  title?: string;
  description?: string;
  schedule?: string;
  dedication?: string;
  shrines?: string;
  priest?: string;
}

export interface WorkerChurchInfoDto {
  id: string;
  siteId: string;
  address: string;
  mapsUrl: string;
  phoneOrSite: string;
  priestPhone: string;
  imageUrl: string;
  galleryImages: string[];
  translations: Partial<Record<"uk" | "ru" | "en", WorkerChurchInfoTranslation>>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Dropped: `siteId` (internal, no admin use), `galleryImages` (a real
 * column, but the admin form has never had a UI control for it — same
 * "not new scope" treatment as Articles' calendarDayId; flagged in the
 * Phase 2B-4 report, not silently discarded from a working feature since
 * it was never editable in this admin to begin with). */
export interface BffChurchInfoDto {
  id: string;
  address: string;
  mapsUrl: string;
  phoneOrSite: string;
  priestPhone: string;
  imageUrl: string;
  translations: Partial<Record<"uk" | "ru" | "en", WorkerChurchInfoTranslation>>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toBffChurchInfoDto(worker: WorkerChurchInfoDto): BffChurchInfoDto {
  return {
    id: worker.id,
    address: worker.address,
    mapsUrl: worker.mapsUrl,
    phoneOrSite: worker.phoneOrSite,
    priestPhone: worker.priestPhone,
    imageUrl: worker.imageUrl,
    translations: worker.translations,
    status: worker.status,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

/** Admin -> Worker payload for PUT (the only write operation — see
 * putChurchInfo()'s upsert-on-first-save behavior). `galleryImages` is
 * deliberately never sent: the admin never reads or edits it, so a PUT
 * omitting it correctly leaves it untouched only if the Worker preserves
 * omitted fields — it does NOT (putChurchInfo defaults every omitted
 * field to '' un-conditionally, see the Phase 2B-4 report's ZERO-ROW /
 * FIRST-SAVE SEMANTICS section) — but since production has 0 rows and
 * gallery_images defaults to '[]' regardless, there is nothing to
 * preserve yet; this is flagged as a real, if currently inert, risk for
 * whenever gallery images are eventually populated some other way. */
export interface WorkerChurchInfoWritePayload {
  address?: string;
  mapsUrl?: string;
  phoneOrSite?: string;
  priestPhone?: string;
  imageUrl?: string;
  status?: string;
  translations?: Partial<Record<"uk" | "ru" | "en", WorkerChurchInfoTranslation>>;
}
