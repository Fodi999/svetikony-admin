import type { BffAlphabetLetterDto } from "@/app/api/bff/alphabet/_contract";
import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource, notImplementedError } from "@/lib/api/http/resource-factory";
import type { AlphabetLetter, Language } from "@/types/entities";

/**
 * BFF DTO -> admin entity mapping (Stage 2C: the BFF now already filters
 * out internal Worker fields — see app/api/bff/alphabet/_contract.ts — so
 * this only handles fields present on BffAlphabetLetterDto but shaped
 * differently, or genuinely not present on the backend at all:
 *  - `pronunciation`: no backend equivalent (the closest field,
 *    `modernEquivalent`, has different semantics — a modern-alphabet
 *    transliteration, not a phonetic pronunciation guide — and was dropped
 *    at the BFF layer entirely) -> always undefined.
 *  - `mainImageId`: the admin model expects a media-library id, but the
 *    backend has no matching media-library record (its raw `mainImageUrl`
 *    was dropped at the BFF layer for the same reason) -> always undefined
 *    for now. Read-only mode never renders this as broken since the
 *    alphabet UI treats a missing image as "no image", not an error.
 */
function toEntity(dto: BffAlphabetLetterDto): AlphabetLetter {
  return {
    id: dto.id,
    translationGroupId: dto.translationGroupId,
    language: dto.language as Language,
    slug: dto.slug,
    order: dto.sortOrder,
    name: dto.name,
    pronunciation: undefined,
    description: dto.shortDescription || undefined,
    historicalNote: dto.fullText || undefined,
    numericValue: dto.numericValue ?? undefined,
    mainImageId: undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
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
  async reorderGroups() {
    notImplementedError();
  },
};
