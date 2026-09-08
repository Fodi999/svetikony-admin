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
 * (internal single-tenant field with no admin use),
 * `linkedIconTranslationGroupId` (admin's `linkedIconId` picks a mock
 * Icon's plain row id — icons aren't wired to real D1 yet, and even once
 * they are, that id isn't a translationGroupId; wiring this relation is
 * deferred, not silently faked).
 *
 * Phase MULTILINGUAL-1 (P1.1): `nameRu`/`nameEn`, `fullDescriptionUk/Ru/En`
 * (a field product-form.tsx never exposed before this phase at all —
 * distinct from the plain `description` column, which has no *_ru/*_en
 * variant and stays Uk-only/unlocalized) and `seoTitleRu/En`/
 * `seoDescriptionRu/En` are now included — product-form.tsx has UK/RU/EN
 * tabs and needs all three languages' values to populate them.
 */
export interface BffProductDto {
  id: string;
  slug: string;
  nameUk: string;
  nameRu: string;
  nameEn: string;
  description: string;
  categoryId: string | null;
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
 * (variants, dimensions, materials, and the icon link have no real D1
 * column/table at all and stay admin-UI-only this stage).
 *
 * Phase MULTILINGUAL-1 (P1.1): `nameRu`/`nameEn`, `fullDescriptionUk/Ru/En`
 * and `seoTitleRu/En`/`seoDescriptionRu/En` are now included — see
 * BffProductDto's doc comment above for why. */
export interface WorkerProductWritePayload {
  slug?: string;
  nameUk?: string;
  nameRu?: string;
  nameEn?: string;
  description?: string;
  categoryId?: string;
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
