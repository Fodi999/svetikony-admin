/**
 * The stable BFF contract for products. Worker DTO -> BFF DTO here is pure
 * field whitelisting/renaming — no semantic decisions (price/cents
 * conversion, enum mapping). Those belong in lib/api/http/products.ts's
 * toEntity()/toPayload(), matching the Calendar Day/Prayers precedent.
 *
 * Rule: Worker can change. This BFF contract must stay stable. The browser
 * (and HttpApiAdapter) only ever sees BffProductDto, never the raw Worker
 * row.
 */

/** Mirrors lib/d1/repositories/products.ts's ChurchProductDto in
 * svet-ikony exactly (Stage 2J). Do not add fields here that aren't in
 * that type. */
export interface WorkerProductDto {
  id: string;
  siteId: string;
  slug: string;
  nameUk: string;
  nameRu: string;
  nameEn: string;
  description: string;
  categoryId: string | null;
  linkedIconTranslationGroupId: string | null;
  fullDescriptionUk: string;
  fullDescriptionRu: string;
  fullDescriptionEn: string;
  galleryUrls: string[];
  photoUrl: string;
  priceCents: number;
  currency: string;
  productionTime: string;
  consecrationAvailable: boolean;
  stockStatus: string;
  featured: boolean;
  seoTitleUk: string;
  seoTitleRu: string;
  seoTitleEn: string;
  seoDescriptionUk: string;
  seoDescriptionRu: string;
  seoDescriptionEn: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fields deliberately dropped here and never sent to the browser: `siteId`
 * (internal single-tenant field with no admin use).
 *
 * Phase MULTILINGUAL-1 (P1.1): `nameRu`/`nameEn`, `fullDescriptionUk/Ru/En`
 * (a field product-form.tsx never exposed before this phase at all —
 * distinct from the plain `description` column, which has no *_ru/*_en
 * variant and stays Uk-only/unlocalized) and `seoTitleRu/En`/
 * `seoDescriptionRu/En` are now included — product-form.tsx has UK/RU/EN
 * tabs and needs all three languages' values to populate them.
 *
 * Phase D prerequisite: `linkedIconTranslationGroupId` is now included —
 * it was previously dropped here on a stale claim ("icons aren't wired to
 * real D1 yet") that stopped being true once church_icons shipped on real
 * D1. This is a REAL relation the Worker already validates and persists
 * (lib/d1/repositories/products.ts's linkedIconGroupExists); admin's
 * `linkedIconId` (lib/api/http/products.ts's toEntity/toPayload) stores
 * this exact translationGroupId, not a specific icon row id — a product
 * links to an icon's whole translation group (all its languages), not to
 * one language's row.
 */
export interface BffProductDto {
  id: string;
  slug: string;
  nameUk: string;
  nameRu: string;
  nameEn: string;
  description: string;
  categoryId: string | null;
  linkedIconTranslationGroupId: string | null;
  fullDescriptionUk: string;
  fullDescriptionRu: string;
  fullDescriptionEn: string;
  galleryUrls: string[];
  photoUrl: string;
  priceCents: number;
  currency: string;
  productionTime: string;
  consecrationAvailable: boolean;
  stockStatus: string;
  featured: boolean;
  seoTitleUk: string;
  seoTitleRu: string;
  seoTitleEn: string;
  seoDescriptionUk: string;
  seoDescriptionRu: string;
  seoDescriptionEn: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function toBffProductDto(worker: WorkerProductDto): BffProductDto {
  return {
    id: worker.id,
    slug: worker.slug,
    nameUk: worker.nameUk,
    nameRu: worker.nameRu,
    nameEn: worker.nameEn,
    description: worker.description,
    categoryId: worker.categoryId,
    linkedIconTranslationGroupId: worker.linkedIconTranslationGroupId,
    fullDescriptionUk: worker.fullDescriptionUk,
    fullDescriptionRu: worker.fullDescriptionRu,
    fullDescriptionEn: worker.fullDescriptionEn,
    galleryUrls: worker.galleryUrls,
    photoUrl: worker.photoUrl,
    priceCents: worker.priceCents,
    currency: worker.currency,
    productionTime: worker.productionTime,
    consecrationAvailable: worker.consecrationAvailable,
    stockStatus: worker.stockStatus,
    featured: worker.featured,
    seoTitleUk: worker.seoTitleUk,
    seoTitleRu: worker.seoTitleRu,
    seoTitleEn: worker.seoTitleEn,
    seoDescriptionUk: worker.seoDescriptionUk,
    seoDescriptionRu: worker.seoDescriptionRu,
    seoDescriptionEn: worker.seoDescriptionEn,
    isActive: worker.isActive,
    sortOrder: worker.sortOrder,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffProductDtoList(workers: WorkerProductDto[]): BffProductDto[] {
  return workers.map(toBffProductDto);
}

/** Admin -> Worker payload for create/update. Same whitelist in reverse —
 * see BffProductDto's doc comment for what's deliberately never sent
 * (variants, dimensions, materials have no real D1 column/table at all
 * and stay admin-UI-only this stage).
 *
 * Phase MULTILINGUAL-1 (P1.1): `nameRu`/`nameEn`, `fullDescriptionUk/Ru/En`
 * and `seoTitleRu/En`/`seoDescriptionRu/En` are now included — see
 * BffProductDto's doc comment above for why.
 *
 * Phase D prerequisite: `linkedIconTranslationGroupId` follows the exact
 * same sentinel convention as `categoryId` (resolveUuidSentinel in
 * svet-ikony: omitted = don't touch, "" = clear, else set) — see
 * lib/api/http/products.ts's toPayload(), which always sends the form's
 * current value so clearing the link actually clears it. */
export interface WorkerProductWritePayload {
  slug?: string;
  nameUk?: string;
  nameRu?: string;
  nameEn?: string;
  description?: string;
  categoryId?: string;
  linkedIconTranslationGroupId?: string;
  fullDescriptionUk?: string;
  fullDescriptionRu?: string;
  fullDescriptionEn?: string;
  galleryUrls?: string[];
  photoUrl?: string;
  priceCents?: number;
  currency?: string;
  productionTime?: string;
  consecrationAvailable?: boolean;
  stockStatus?: string;
  featured?: boolean;
  seoTitleUk?: string;
  seoTitleRu?: string;
  seoTitleEn?: string;
  seoDescriptionUk?: string;
  seoDescriptionRu?: string;
  seoDescriptionEn?: string;
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * AI shop-copy (Phase D) -- mirrors lib/church/product-ai-actions.ts in
 * svet-ikony exactly. Pure field whitelisting here, same rule as the rest
 * of this file: the semantic split of a flat field key like
 * "fullDescriptionRu" into the admin's `{language: "ru", field:
 * "fullDescription"}` shape (types/entities.ts's ProductAiField) happens
 * in lib/api/http/products.ts, not here.
 */
export type WorkerProductTextField =
  | "fullDescriptionUk" | "fullDescriptionRu" | "fullDescriptionEn"
  | "seoTitleUk" | "seoTitleRu" | "seoTitleEn"
  | "seoDescriptionUk" | "seoDescriptionRu" | "seoDescriptionEn";
export type BffProductTextField = WorkerProductTextField;

export type WorkerProductAiWriteResultDto = { mode: "direct"; product: WorkerProductDto } | { mode: "proposal"; product: WorkerProductDto; proposalId: string };
export type BffProductAiWriteResultDto = { mode: "direct"; product: BffProductDto } | { mode: "proposal"; product: BffProductDto; proposalId: string };
export function toBffProductAiWriteResultDto(worker: WorkerProductAiWriteResultDto): BffProductAiWriteResultDto {
  return worker.mode === "direct"
    ? { mode: "direct", product: toBffProductDto(worker.product) }
    : { mode: "proposal", product: toBffProductDto(worker.product), proposalId: worker.proposalId };
}

type WorkerProductAiSkip = { field: WorkerProductTextField; reason: "failed" };
type BffProductAiSkip = WorkerProductAiSkip;
export type WorkerProductAiFillResultDto =
  | { mode: "direct"; product: WorkerProductDto; filled: WorkerProductTextField[]; skipped: WorkerProductAiSkip[] }
  | { mode: "proposal"; product: WorkerProductDto; proposalId: string | null; proposedFields: WorkerProductTextField[]; skipped: WorkerProductAiSkip[] };
export type BffProductAiFillResultDto =
  | { mode: "direct"; product: BffProductDto; filled: BffProductTextField[]; skipped: BffProductAiSkip[] }
  | { mode: "proposal"; product: BffProductDto; proposalId: string | null; proposedFields: BffProductTextField[]; skipped: BffProductAiSkip[] };
export function toBffProductAiFillResultDto(worker: WorkerProductAiFillResultDto): BffProductAiFillResultDto {
  return worker.mode === "direct"
    ? { mode: "direct", product: toBffProductDto(worker.product), filled: worker.filled, skipped: worker.skipped }
    : { mode: "proposal", product: toBffProductDto(worker.product), proposalId: worker.proposalId, proposedFields: worker.proposedFields, skipped: worker.skipped };
}
