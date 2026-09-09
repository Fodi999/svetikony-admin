import type { BffAlphabetLetterDto, WorkerAlphabetLetterWritePayload } from "@/app/api/bff/alphabet/_contract";
import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource, notImplementedError } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import type { AlphabetLetter, Language } from "@/types/entities";
import type { AlphabetLetterFormValues } from "@/lib/validation/alphabet.schema";

/**
 * BFF DTO -> admin entity mapping (real-writes phase: the BFF now includes
 * `letter`/`mainImageUrl` — see app/api/bff/alphabet/_contract.ts — so this
 * only handles fields present on BffAlphabetLetterDto but shaped
 * differently, or genuinely not present on the backend at all:
 *  - `pronunciation`: no backend equivalent (the closest field,
 *    `modernEquivalent`, has different semantics — a modern-alphabet
 *    transliteration, not a phonetic pronunciation guide — and stays
 *    dropped at the BFF layer entirely) -> always undefined.
 *  - `mainImageId`: mirrors Saints' `imageUrl` -> `imageId` convention —
 *    the backend's `main_image_url` column stores a bare R2 key (same
 *    Icons/Saints pattern, resolved back to a displayable URL client-side
 *    via resolveMediaPreviewUrl()), not a resolved absolute URL.
 */
function toEntity(dto: BffAlphabetLetterDto): AlphabetLetter {
  return {
    id: dto.id,
    translationGroupId: dto.translationGroupId,
    language: dto.language as Language,
    slug: dto.slug,
    order: dto.sortOrder,
    letter: dto.letter,
    name: dto.name,
    pronunciation: undefined,
    description: dto.shortDescription || undefined,
    historicalNote: dto.fullText || undefined,
    numericValue: dto.numericValue ?? undefined,
    mainImageId: dto.mainImageUrl || undefined,
    audioUrl: dto.audioUrl || undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Admin form -> Worker write payload. Only fields the Worker's
 * ChurchAlphabetLetterPayload accepts that the admin form actually edits —
 * see toEntity()'s doc comment for what's deliberately not sent. */
function toPayload(values: AlphabetLetterFormValues): WorkerAlphabetLetterWritePayload {
  return {
    slug: values.slug,
    letter: values.letter,
    sortOrder: values.order,
    name: values.name,
    language: values.language,
    shortDescription: values.description ?? "",
    fullText: values.historicalNote ?? "",
    numericValue: values.numericValue ?? null,
    mainImageUrl: values.mainImageId ?? "",
    audioUrl: values.audioUrl ?? "",
  };
}

/**
 * Backend supports a `language` filter server-side but no search/pagination
 * (GET /api/admin/church-content/alphabet returns the full flat array) — so
 * search, sort, and pagination are done by the shared factory to preserve
 * the ApiClient contract without changing what the UI expects.
 */
const baseResource = createHttpListResource<BffAlphabetLetterDto, AlphabetLetter, TranslatableQuery>({
  listPath: BFF_ENDPOINTS.alphabetLetters,
  itemPath: (id) => `${BFF_ENDPOINTS.alphabetLetters}/${encodeURIComponent(id)}`,
  toEntity,
  buildBackendParams: (query) => {
    const params = new URLSearchParams();
    if (query?.language) params.set("language", query.language);
    return params;
  },
  searchFields: (letter) => [letter.name, letter.slug],
  sort: (a, b) => a.order - b.order,
});

export const alphabetLettersHttpResource: ApiClient["alphabetLetters"] = {
  ...baseResource,
  async create(values: AlphabetLetterFormValues): Promise<AlphabetLetter> {
    const dto = await httpPost<BffAlphabetLetterDto>(BFF_ENDPOINTS.alphabetLetters, toPayload(values));
    return toEntity(dto);
  },
  async update(id: string, values: AlphabetLetterFormValues): Promise<AlphabetLetter> {
    const dto = await httpPut<BffAlphabetLetterDto>(`${BFF_ENDPOINTS.alphabetLetters}/${encodeURIComponent(id)}`, toPayload(values));
    return toEntity(dto);
  },
  async remove(id: string): Promise<void> {
    await httpDelete(`${BFF_ENDPOINTS.alphabetLetters}/${encodeURIComponent(id)}`);
  },
  /**
   * Reordering is a separate, unwritten concern (svet-ikony's
   * reorderAlphabetLetters route exists but this admin has no drag-and-drop
   * UI calling it yet) — left as an honest stub rather than wired up as
   * part of the real-writes/audio/photo scope.
   */
  async reorderGroups() {
    notImplementedError();
  },
  /**
   * Same slug-matching auto-join as Icons/Saints (lib/api/http/saints.ts) —
   * the Worker's createAlphabetLetter inherits translation_group_id from an
   * existing row with the same slug, so a new translation is just a plain
   * create with the same slug and a different language.
   */
  async createTranslation(_groupId: string, language: string, values: AlphabetLetterFormValues): Promise<AlphabetLetter> {
    const dto = await httpPost<BffAlphabetLetterDto>(
      BFF_ENDPOINTS.alphabetLetters,
      toPayload({ ...values, language: language as AlphabetLetterFormValues["language"] }),
    );
    return toEntity(dto);
  },
};
