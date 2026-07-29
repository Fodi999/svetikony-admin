/**
 * The stable BFF contract for Alphabet. Worker DTO -> BFF DTO here is pure
 * field whitelisting/renaming — no semantic decisions (enum fallbacks,
 * null/"" -> undefined, JSON validation). Those belong in
 * lib/api/http/alphabet.ts's toEntity(), the one place that already made
 * those calls for Stage 2. This file only decides WHICH fields leave the
 * server; that file decides HOW to interpret them.
 *
 * Rule: Worker can change. This BFF contract must stay stable. The browser
 * (and HttpApiAdapter) only ever sees BffAlphabetLetterDto, never the raw
 * Worker row.
 */

/** Mirrors lib/d1/repositories/alphabet.ts's ChurchAlphabetLetterDto in
 * svet-ikony exactly (confirmed via curl, Stage 2). Do not add fields here
 * that aren't in that type. */
export interface WorkerAlphabetLetterDto {
  id: string;
  siteId: string;
  slug: string;
  letter: string;
  sortOrder: number;
  name: string;
  shortDescription: string;
  fullText: string;
  numericValue: number | null;
  modernEquivalent: string;
  color: string;
  cardImageUrl: string;
  mainImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  language: string;
  translationGroupId: string;
  status: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fields deliberately dropped here and never sent to the browser: `siteId`,
 * `letter` (single-glyph display form, unused by admin), `modernEquivalent`,
 * `color`, `cardImageUrl`, `seoTitle`, `seoDescription`, `status`,
 * `isGlobal` — all internal Worker/content-model fields with no admin use.
 * `mainImageUrl` is also dropped: lib/api/http/alphabet.ts's toEntity()
 * intentionally never reads it (admin's mainImageId expects a media-library
 * id, which the Worker doesn't have — see that file's doc comment), so
 * there is nothing here for it to be used for.
 */
export interface BffAlphabetLetterDto {
  id: string;
  slug: string;
  sortOrder: number;
  name: string;
  shortDescription: string;
  fullText: string;
  numericValue: number | null;
  language: string;
  translationGroupId: string;
  createdAt: string;
  updatedAt: string;
}

export function toBffAlphabetLetterDto(worker: WorkerAlphabetLetterDto): BffAlphabetLetterDto {
  return {
    id: worker.id,
    slug: worker.slug,
    sortOrder: worker.sortOrder,
    name: worker.name,
    shortDescription: worker.shortDescription,
    fullText: worker.fullText,
    numericValue: worker.numericValue,
    language: worker.language,
    translationGroupId: worker.translationGroupId,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffAlphabetLetterDtoList(workers: WorkerAlphabetLetterDto[]): BffAlphabetLetterDto[] {
  return workers.map(toBffAlphabetLetterDto);
}
