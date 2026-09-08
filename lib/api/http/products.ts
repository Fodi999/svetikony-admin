import type { BffProductDto, WorkerProductWritePayload } from "@/app/api/bff/products/_contract";
import type { ApiClient, ProductQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import type { ProductFormValues } from "@/lib/validation/product.schema";
import type { Product, StockStatus } from "@/types/entities";

/**
 * Real local data (church_orders.rs-mirrored `icon_order_options`) uses
 * `available/made_to_order/unavailable` for stock status; the admin's own
 * taxonomy is `in_stock/made_to_order/out_of_stock` — a real, documented
 * mismatch, but (unlike Prayer's prayerType or Calendar's dayType) this one
 * is a clean 1:1 relabeling, not a taxonomy that never overlapped, so it's
 * translated both ways instead of relaxing a DB constraint.
 */
const STOCK_STATUS_TO_WORKER: Record<StockStatus, string> = {
  in_stock: "available",
  made_to_order: "made_to_order",
  out_of_stock: "unavailable",
};
const STOCK_STATUS_FROM_WORKER: Record<string, StockStatus> = {
  available: "in_stock",
  made_to_order: "made_to_order",
  unavailable: "out_of_stock",
};

/**
 * BFF DTO -> admin entity mapping (widened Phase MULTILINGUAL-1 P1.1).
 *
 * `imageIds` <-> `photoUrl`/`galleryUrls`: the Worker keeps one primary
 * photo plus a gallery array; the admin model has a single ordered list.
 * Round-trips losslessly: the primary photo is always included in
 * `galleryUrls` too (see toPayload below), so reading it back never drops
 * anything.
 *
 * `productionTimeDays` <-> `productionTime`: the Worker column is free text
 * (e.g. "5-7 днів"), the admin field is a plain number of days — best-effort
 * parse, falling back to undefined rather than guessing at unparseable text.
 *
 * `title`/`seoTitle`/`seoDescription` stay Uk-derived read-only convenience
 * fields for existing list-view/breadcrumb consumers (see types/entities.ts's
 * ProductTranslation doc comment); `translations` carries all three
 * languages (including the new `fullDescription`, which had no admin field
 * at all before this phase) for product-form.tsx's UK/RU/EN tabs.
 *
 * Deliberately NOT mapped this stage (no real D1 column/table exists, or —
 * for the icon link — the only thing available to map from is a mock Icon
 * id, not a real translationGroupId): `linkedIconId`, `dimensions`,
 * `materials`, `variants`. These stay admin-UI-only, same treatment as
 * Calendar Day's `relatedIconIds` etc. in Stage 2H.
 */
function toEntity(dto: BffProductDto): Product {
  const parsedProductionDays = Number.parseInt(dto.productionTime, 10);
  return {
    id: dto.id,
    title: dto.nameUk,
    slug: dto.slug,
    description: dto.description,
    price: dto.priceCents,
    currency: dto.currency,
    stockStatus: STOCK_STATUS_FROM_WORKER[dto.stockStatus] ?? "out_of_stock",
    featured: dto.featured,
    active: dto.isActive,
    imageIds: dto.galleryUrls.length ? dto.galleryUrls : dto.photoUrl ? [dto.photoUrl] : [],
    categoryId: dto.categoryId ?? "",
    linkedIconId: undefined,
    dimensions: undefined,
    materials: undefined,
    productionTimeDays: Number.isFinite(parsedProductionDays) ? parsedProductionDays : undefined,
    consecrated: dto.consecrationAvailable,
    variants: [],
    seoTitle: dto.seoTitleUk || undefined,
    seoDescription: dto.seoDescriptionUk || undefined,
    translations: {
      uk: { title: dto.nameUk, fullDescription: dto.fullDescriptionUk, seoTitle: dto.seoTitleUk, seoDescription: dto.seoDescriptionUk },
      ru: { title: dto.nameRu, fullDescription: dto.fullDescriptionRu, seoTitle: dto.seoTitleRu, seoDescription: dto.seoDescriptionRu },
      en: { title: dto.nameEn, fullDescription: dto.fullDescriptionEn, seoTitle: dto.seoTitleEn, seoDescription: dto.seoDescriptionEn },
    },
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Always sends every language's current form value (never a partial diff)
 * — the Worker's `updateProduct()` treats an OMITTED nameRu/nameEn/
 * fullDescriptionRu/fullDescriptionEn/seoTitleRu/En/seoDescriptionRu/En as
 * "leave unchanged" (`payload.nameRu ?? current.nameRu`, verified in
 * svet-ikony's products.ts), but a SENT empty string overwrites, so this
 * must always forward the form's real current translations state for all
 * three languages, matching Church Info's toPayload() precedent (see
 * write-isolation test coverage in svet-ikony's
 * products.write-isolation.test.ts). The plain `description` field has no
 * per-language column and is sent as before, unrelated to `translations`.
 */
function toPayload(values: ProductFormValues): WorkerProductWritePayload {
  return {
    slug: values.slug,
    nameUk: values.translations.uk.title,
    nameRu: values.translations.ru.title ?? "",
    nameEn: values.translations.en.title ?? "",
    description: values.description,
    categoryId: values.categoryId || "",
    fullDescriptionUk: values.translations.uk.fullDescription ?? "",
    fullDescriptionRu: values.translations.ru.fullDescription ?? "",
    fullDescriptionEn: values.translations.en.fullDescription ?? "",
    galleryUrls: values.imageIds,
    photoUrl: values.imageIds[0] ?? "",
    priceCents: Math.round(values.price),
    currency: values.currency,
    productionTime: values.productionTimeDays !== undefined ? String(values.productionTimeDays) : "",
    consecrationAvailable: values.consecrated,
    stockStatus: STOCK_STATUS_TO_WORKER[values.stockStatus],
    featured: values.featured,
    seoTitleUk: values.translations.uk.seoTitle ?? "",
    seoTitleRu: values.translations.ru.seoTitle ?? "",
    seoTitleEn: values.translations.en.seoTitle ?? "",
    seoDescriptionUk: values.translations.uk.seoDescription ?? "",
    seoDescriptionRu: values.translations.ru.seoDescription ?? "",
    seoDescriptionEn: values.translations.en.seoDescription ?? "",
    isActive: values.active,
    sortOrder: 0,
  };
}

/**
 * Backend has no server-side filters at all (unlike Prayers' `language`) —
 * categoryId/active/featured are all applied client-side by the shared
 * factory, matching what features/catalog/product-list-view.tsx sends.
 */
const baseResource = createHttpListResource<BffProductDto, Product, ProductQuery>({
  listPath: BFF_ENDPOINTS.products,
  itemPath: (id) => `${BFF_ENDPOINTS.products}/${encodeURIComponent(id)}`,
  toEntity,
  filter: (product, query) =>
    (!query?.categoryId || product.categoryId === query.categoryId) &&
    (query?.active === undefined || product.active === query.active) &&
    (query?.featured === undefined || product.featured === query.featured),
  searchFields: (product) => [product.title, product.description, product.slug],
  sort: (a, b) => a.title.localeCompare(b.title),
});

export const productsHttpResource: ApiClient["products"] = {
  ...baseResource,
  async create(values: ProductFormValues): Promise<Product> {
    const dto = await httpPost<BffProductDto>(BFF_ENDPOINTS.products, toPayload(values));
    return toEntity(dto);
  },
  async update(id: string, values: ProductFormValues): Promise<Product> {
    const dto = await httpPut<BffProductDto>(`${BFF_ENDPOINTS.products}/${encodeURIComponent(id)}`, toPayload(values));
    return toEntity(dto);
  },
  async remove(id: string): Promise<void> {
    await httpDelete(`${BFF_ENDPOINTS.products}/${encodeURIComponent(id)}`);
  },
};
