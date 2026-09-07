/**
 * The stable BFF contract for Articles. Worker DTO -> BFF DTO here is pure
 * field whitelisting — no semantic decisions (enum fallbacks, null/"" ->
 * undefined). Those belong in lib/api/http/articles.ts's toEntity()/
 * toPayload(), matching the Icons/Saints/Calendar Day precedent.
 *
 * Rule: Worker can change. This BFF contract must stay stable. The browser
 * (and HttpApiAdapter) only ever sees BffArticleDto, never the raw Worker row.
 */

/** Mirrors svet-ikony's lib/d1/repositories/articles.ts's ChurchArticleDto
 * exactly (Phase 2B-2). Do not add fields here that aren't in that type —
 * in particular, there is no translationGroupId, no image/cover column,
 * and no saint-relation column of any kind: church_articles genuinely has
 * none of these (verified directly against the migration and repository,
 * not assumed) — see the Phase 2B-2 report's ARTICLE FIELD CONTRACT
 * section for the full reasoning. */
export interface WorkerArticleDto {
  id: string;
  siteId: string;
  iconId: string | null;
  calendarDayId: string | null;
  title: string;
  slug: string;
  content: string;
  language: string;
  seoTitle: string;
  seoDescription: string;
  status: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Unlike Saints (whose BffSaintDto drops iconId/calendarDayId entirely),
 * `iconId` IS forwarded here: it is a real, singular FK the admin form now
 * edits directly as a single relation (see lib/api/http/articles.ts) —
 * there is no plural relatedIconIds picker to reconcile it against for
 * Articles, so there is no reason to drop it. `calendarDayId` is equally
 * real but not yet exposed by any admin field; left in the contract for
 * forward compatibility, unused today. Dropped: `siteId`, `isGlobal`
 * (internal single-tenant/Worker fields with no admin use).
 */
export interface BffArticleDto {
  id: string;
  iconId: string | null;
  calendarDayId: string | null;
  title: string;
  slug: string;
  content: string;
  language: string;
  seoTitle: string;
  seoDescription: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toBffArticleDto(worker: WorkerArticleDto): BffArticleDto {
  return {
    id: worker.id,
    iconId: worker.iconId,
    calendarDayId: worker.calendarDayId,
    title: worker.title,
    slug: worker.slug,
    content: worker.content,
    language: worker.language,
    seoTitle: worker.seoTitle,
    seoDescription: worker.seoDescription,
    status: worker.status,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffArticleDtoList(workers: WorkerArticleDto[]): BffArticleDto[] {
  return workers.map(toBffArticleDto);
}

/** Admin -> Worker payload for create/update. Same whitelist in reverse —
 * see BffArticleDto's doc comment for what's deliberately never sent
 * (there is nothing dropped here: every field the admin form edits has a
 * real column to write to). */
export interface WorkerArticleWritePayload {
  iconId?: string | null;
  calendarDayId?: string | null;
  title?: string;
  slug?: string;
  content?: string;
  language?: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: string;
}
