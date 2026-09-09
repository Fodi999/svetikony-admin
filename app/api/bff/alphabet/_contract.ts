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
 * svet-ikony exactly (confirmed via source read, real-writes phase). Do
 * not add fields here that aren't in that type. `audioUrl` was added by
 * svet-ikony migration 0018_alphabet_audio.sql. */
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
  audioUrl: string;
  language: string;
  translationGroupId: string;
  status: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fields deliberately dropped here and never sent to the browser: `siteId`,
 * `modernEquivalent`, `color`, `cardImageUrl`, `seoTitle`, `seoDescription`,
 * `status`, `isGlobal` — internal Worker/content-model fields with no admin
 * use (Alphabet's admin model has no publish lifecycle at all yet — see
 * lib/api/http/alphabet.ts's toEntity() doc comment).
 *
 * `letter` (the single-glyph display form, e.g. "Б") and `mainImageUrl` are
 * now included — real-writes phase: `letter` is a required backend field
 * (createAlphabetLetter throws validation error without it) so the admin
 * form must be able to send it; `mainImageUrl` backs the new real photo
 * upload button (lib/api/http/alphabet.ts's toEntity() maps it to
 * `mainImageId`, matching Saints' `imageUrl` -> `imageId` convention).
 */
export interface BffAlphabetLetterDto {
  id: string;
  slug: string;
  letter: string;
  sortOrder: number;
  name: string;
  shortDescription: string;
  fullText: string;
  numericValue: number | null;
  mainImageUrl: string;
  audioUrl: string;
  language: string;
  translationGroupId: string;
  createdAt: string;
  updatedAt: string;
}

export function toBffAlphabetLetterDto(worker: WorkerAlphabetLetterDto): BffAlphabetLetterDto {
  return {
    id: worker.id,
    slug: worker.slug,
    letter: worker.letter,
    sortOrder: worker.sortOrder,
    name: worker.name,
    shortDescription: worker.shortDescription,
    fullText: worker.fullText,
    numericValue: worker.numericValue,
    mainImageUrl: worker.mainImageUrl,
    audioUrl: worker.audioUrl,
    language: worker.language,
    translationGroupId: worker.translationGroupId,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffAlphabetLetterDtoList(workers: WorkerAlphabetLetterDto[]): BffAlphabetLetterDto[] {
  return workers.map(toBffAlphabetLetterDto);
}

/** Admin -> Worker payload for create/update. Same whitelist in reverse —
 * see BffAlphabetLetterDto's doc comment for what's deliberately not sent.
 * `pronunciation` has no backend equivalent (see toEntity()'s doc comment
 * in lib/api/http/alphabet.ts) and is never part of this payload. */
export interface WorkerAlphabetLetterWritePayload {
  slug?: string;
  letter?: string;
  sortOrder?: number;
  name?: string;
  shortDescription?: string;
  fullText?: string;
  numericValue?: number | null;
  mainImageUrl?: string;
  audioUrl?: string;
  language?: string;
}
