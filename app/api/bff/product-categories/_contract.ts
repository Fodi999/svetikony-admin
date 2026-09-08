/**
 * The stable BFF contract for product categories. Worker DTO -> BFF DTO
 * here is pure field whitelisting/renaming — no semantic decisions (enum
 * fallbacks, null/"" -> undefined, currency conversion). Those belong in
 * lib/api/http/product-categories.ts's toEntity()/toPayload(), matching
 * the Calendar Day/Prayers precedent.
 *
 * Rule: Worker can change. This BFF contract must stay stable. The browser
 * (and HttpApiAdapter) only ever sees BffProductCategoryDto, never the raw
 * Worker row.
 */

/** Mirrors lib/d1/repositories/productCategories.ts's ChurchProductCategoryDto
 * in svet-ikony exactly (Stage 2J). Do not add fields here that aren't in
 * that type. */
export interface WorkerProductCategoryDto {
  id: string;
  siteId: string;
  slug: string;
  nameUk: string;
  nameRu: string;
  nameEn: string;
  descriptionUk: string;
  descriptionRu: string;
  descriptionEn: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Fields deliberately dropped here and never sent to the browser: `siteId`
 * — internal single-tenant field with no admin use. */
export interface BffProductCategoryDto {
  id: string;
  slug: string;
  nameUk: string;
  nameRu: string;
  nameEn: string;
  descriptionUk: string;
  descriptionRu: string;
  descriptionEn: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function toBffProductCategoryDto(worker: WorkerProductCategoryDto): BffProductCategoryDto {
  return {
    id: worker.id,
    slug: worker.slug,
    nameUk: worker.nameUk,
    nameRu: worker.nameRu,
    nameEn: worker.nameEn,
    descriptionUk: worker.descriptionUk,
    descriptionRu: worker.descriptionRu,
    descriptionEn: worker.descriptionEn,
    imageUrl: worker.imageUrl,
    isActive: worker.isActive,
    sortOrder: worker.sortOrder,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffProductCategoryDtoList(workers: WorkerProductCategoryDto[]): BffProductCategoryDto[] {
  return workers.map(toBffProductCategoryDto);
}

/** Admin -> Worker payload for create/update. Same whitelist in reverse:
 * only fields the Worker's ChurchProductCategoryPayload actually accepts.
 *
 * Phase MULTILINGUAL-1 (P1.2): `nameRu`/`nameEn`/`descriptionRu`/
 * `descriptionEn` are now included — category-form.tsx has UK/RU/EN tabs
 * and always sends the form's full current translations state on every
 * save (never a partial diff), matching Church Info's toPayload()
 * precedent. The public site still falls back to the `Uk` field when
 * `Ru`/`En` are empty (see ShopCatalog.tsx's `productCategoryName()`), so
 * an admin who hasn't filled in RU/EN yet still degrades gracefully. */
export interface WorkerProductCategoryWritePayload {
  slug?: string;
  nameUk?: string;
  nameRu?: string;
  nameEn?: string;
  descriptionUk?: string;
  descriptionRu?: string;
  descriptionEn?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}
