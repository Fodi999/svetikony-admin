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
 * BFF DTO -> admin entity mapping.
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
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function toPayload(values: ProductFormValues): WorkerProductWritePayload {
  return {
    slug: values.slug,
    nameUk: values.title,
    description: values.description,
    categoryId: values.categoryId || "",
    galleryUrls: values.imageIds,
    photoUrl: values.imageIds[0] ?? "",
    priceCents: Math.round(values.price),
    currency: values.currency,
    productionTime: values.productionTimeDays !== undefined ? String(values.productionTimeDays) : "",
    consecrationAvailable: values.consecrated,
    stockStatus: STOCK_STATUS_TO_WORKER[values.stockStatus],
    featured: values.featured,
    seoTitleUk: values.seoTitle ?? "",
    seoDescriptionUk: values.seoDescription ?? "",
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
