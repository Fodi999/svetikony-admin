import type { BffProductCategoryDto, WorkerProductCategoryWritePayload } from "@/app/api/bff/product-categories/_contract";
import type { ApiClient } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import type { ProductCategoryFormValues } from "@/lib/validation/category.schema";
import type { ListQuery } from "@/types/api";
import type { ProductCategory } from "@/types/entities";

/**
 * BFF DTO -> admin entity mapping (Stage 2J). The Worker stores name/
 * description per-locale (nameUk/Ru/En); the admin form edits a single
 * field, same treatment as Calendar Day's single `language` — always reads/
 * writes the `Uk` column. `Ru`/`En` are left untouched (never sent), and
 * the public site already falls back to `nameUk` when they're empty (see
 * svet-ikony's ShopCatalog.tsx `productCategoryName()`), so this degrades
 * gracefully rather than showing blank text in other locales.
 */
function toEntity(dto: BffProductCategoryDto): ProductCategory {
  return {
    id: dto.id,
    name: dto.nameUk,
    slug: dto.slug,
    description: dto.descriptionUk || undefined,
    imageId: dto.imageUrl || undefined,
    order: dto.sortOrder,
    active: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function toPayload(values: ProductCategoryFormValues): WorkerProductCategoryWritePayload {
  return {
    slug: values.slug,
    nameUk: values.name,
    descriptionUk: values.description ?? "",
    imageUrl: values.imageId ?? "",
    isActive: values.active,
    sortOrder: values.order,
  };
}

const baseResource = createHttpListResource<BffProductCategoryDto, ProductCategory, ListQuery>({
  listPath: BFF_ENDPOINTS.categories,
  itemPath: (id) => `${BFF_ENDPOINTS.categories}/${encodeURIComponent(id)}`,
  toEntity,
  searchFields: (category) => [category.name, category.slug],
  sort: (a, b) => a.order - b.order,
});

export const categoriesHttpResource: ApiClient["categories"] = {
  ...baseResource,
  async create(values: ProductCategoryFormValues): Promise<ProductCategory> {
    const dto = await httpPost<BffProductCategoryDto>(BFF_ENDPOINTS.categories, toPayload(values));
    return toEntity(dto);
  },
  async update(id: string, values: ProductCategoryFormValues): Promise<ProductCategory> {
    const dto = await httpPut<BffProductCategoryDto>(`${BFF_ENDPOINTS.categories}/${encodeURIComponent(id)}`, toPayload(values));
    return toEntity(dto);
  },
  async remove(id: string): Promise<void> {
    await httpDelete(`${BFF_ENDPOINTS.categories}/${encodeURIComponent(id)}`);
  },
};
