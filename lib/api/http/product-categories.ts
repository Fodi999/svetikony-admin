import type { BffProductCategoryDto, WorkerProductCategoryWritePayload } from "@/app/api/bff/product-categories/_contract";
import type { ApiClient } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import type { ProductCategoryFormValues } from "@/lib/validation/category.schema";
import type { ListQuery } from "@/types/api";
import type { ProductCategory } from "@/types/entities";

/**
 * BFF DTO -> admin entity mapping (Stage 2J; widened Phase MULTILINGUAL-1
 * P1.2). The Worker stores name/description per-locale (nameUk/Ru/En) as
 * columns on one row. `name`/`description` stay Uk-derived read-only
 * convenience fields for existing list-view/breadcrumb consumers (see
 * types/entities.ts's ProductCategoryTranslation doc comment); `translations`
 * carries all three languages for category-form.tsx's UK/RU/EN tabs.
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
    translations: {
      uk: { name: dto.nameUk, description: dto.descriptionUk },
      ru: { name: dto.nameRu, description: dto.descriptionRu },
      en: { name: dto.nameEn, description: dto.descriptionEn },
    },
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Always sends every language's current form value (never a partial diff)
 * — the Worker's `updateProductCategory()` treats an OMITTED nameRu/nameEn/
 * descriptionRu/descriptionEn as "leave unchanged" (`payload.nameRu ??
 * current.nameRu`, verified in svet-ikony's productCategories.ts), but a
 * SENT empty string overwrites, so this must always forward the form's
 * real current translations state for all three languages, matching
 * Church Info's toPayload() precedent (see write-isolation test coverage
 * in svet-ikony's productCategories.write-isolation.test.ts).
 */
function toPayload(values: ProductCategoryFormValues): WorkerProductCategoryWritePayload {
  return {
    slug: values.slug,
    nameUk: values.translations.uk.name,
    nameRu: values.translations.ru.name ?? "",
    nameEn: values.translations.en.name ?? "",
    descriptionUk: values.translations.uk.description ?? "",
    descriptionRu: values.translations.ru.description ?? "",
    descriptionEn: values.translations.en.description ?? "",
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
