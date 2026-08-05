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
 * Fields deliberately dropped here and never sent to the browser: `siteId`,
 * `nameRu`/`nameEn` (admin form is single-language, matches Calendar Day),
 * `linkedIconTranslationGroupId` (admin's `linkedIconId` picks a mock
 * Icon's plain row id — icons aren't wired to real D1 yet, and even once
 * they are, that id isn't a translationGroupId; wiring this relation is
 * deferred, not silently faked), `fullDescriptionUk/Ru/En` (no admin
 * field maps to this — admin only has one `description`, which maps to
 * the Worker's plain `description` column, a different field from
 * `fullDescription*`), `seoTitleRu/En`/`seoDescriptionRu/En` (admin's
 * `seoTitle`/`seoDescription` are single fields, same Uk-only treatment
 * as name/description).
 */
export interface BffProductDto {
  id: string;
  slug: string;
  nameUk: string;
  description: string;
  categoryId: string | null;
  galleryUrls: string[];
  photoUrl: string;
  priceCents: number;
  currency: string;
  productionTime: string;
  consecrationAvailable: boolean;
  stockStatus: string;
  featured: boolean;
  seoTitleUk: string;
  seoDescriptionUk: string;
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
    description: worker.description,
    categoryId: worker.categoryId,
    galleryUrls: worker.galleryUrls,
    photoUrl: worker.photoUrl,
    priceCents: worker.priceCents,
    currency: worker.currency,
    productionTime: worker.productionTime,
    consecrationAvailable: worker.consecrationAvailable,
    stockStatus: worker.stockStatus,
    featured: worker.featured,
    seoTitleUk: worker.seoTitleUk,
    seoDescriptionUk: worker.seoDescriptionUk,
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
 * column/table at all and stay admin-UI-only this stage). */
export interface WorkerProductWritePayload {
  slug?: string;
  nameUk?: string;
  description?: string;
  categoryId?: string;
  galleryUrls?: string[];
  photoUrl?: string;
  priceCents?: number;
  currency?: string;
  productionTime?: string;
  consecrationAvailable?: boolean;
  stockStatus?: string;
  featured?: boolean;
  seoTitleUk?: string;
  seoDescriptionUk?: string;
  isActive?: boolean;
  sortOrder?: number;
}
