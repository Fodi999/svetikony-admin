import type { z } from "zod";
import type { BffIconDto, WorkerIconWritePayload } from "@/app/api/bff/icons/_contract";
import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import { contentStatusSchema, languageSchema } from "@/lib/validation/common";
import type { IconFormValues } from "@/lib/validation/icon.schema";
import type { ContentStatus, Icon, Language } from "@/types/entities";

/** Same defensive pattern as Calendar Day/Prayers: fall back rather than
 * an unchecked cast if the Worker's value doesn't match the admin's enum. */
function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

/**
 * BFF DTO -> admin entity mapping. `galleryImageIds`/`relatedPrayerIds`/
 * `relatedArticleIds`/`relatedCalendarDayIds` are deliberately always []:
 * `church_icons` has no gallery column (a single `image_url` only), and
 * the related-content relation is inverted — `church_prayers`,
 * `church_articles`, `church_saints`, and `church_gospel_readings` each
 * carry their own `icon_id` FK pointing at this row, not the other way
 * around — same deferral as Calendar Day's related* fields in Stage 2H.
 * `history`/`saintImageDescription`/`materials`/`dimensions` have no
 * matching Worker column either and stay mock-only/UI-only, matching
 * Product's `dimensions`/`materials` precedent in Stage 2J.
 */
function toEntity(dto: BffIconDto): Icon {
  return {
    id: dto.id,
    translationGroupId: dto.translationGroupId,
    language: safeEnum<Language>(languageSchema, dto.language, "uk"),
    slug: dto.slug,
    title: dto.title,
    description: dto.description,
    history: undefined,
    saintImageDescription: undefined,
    materials: undefined,
    dimensions: undefined,
    mainImageId: dto.imageUrl || undefined,
    galleryImageIds: [],
    relatedPrayerIds: [],
    relatedArticleIds: [],
    relatedCalendarDayIds: [],
    status: safeEnum<ContentStatus>(contentStatusSchema, dto.status, "draft"),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Admin form -> Worker write payload. Only fields the Worker's
 * ChurchIconPayload accepts that the admin form actually edits — see
 * toEntity()'s doc comment for what's deliberately not sent. */
function toPayload(values: IconFormValues): WorkerIconWritePayload {
  return {
    title: values.title,
    slug: values.slug,
    language: values.language,
    description: values.description,
    imageUrl: values.mainImageId ?? "",
    status: values.status,
  };
}

const baseResource = createHttpListResource<BffIconDto, Icon, TranslatableQuery>({
  listPath: BFF_ENDPOINTS.icons,
  itemPath: (id) => `${BFF_ENDPOINTS.icons}/${encodeURIComponent(id)}`,
  toEntity,
  filter: (icon, query) => (!query?.status || icon.status === query.status) && (!query?.language || icon.language === query.language),
  searchFields: (icon) => [icon.title, icon.slug],
  sort: (a, b) => a.title.localeCompare(b.title),
});

export const iconsHttpResource: ApiClient["icons"] = {
  ...baseResource,
  async create(values: IconFormValues): Promise<Icon> {
    const dto = await httpPost<BffIconDto>(BFF_ENDPOINTS.icons, toPayload(values));
    return toEntity(dto);
  },
  async update(id: string, values: IconFormValues): Promise<Icon> {
    const dto = await httpPut<BffIconDto>(`${BFF_ENDPOINTS.icons}/${encodeURIComponent(id)}`, toPayload(values));
    return toEntity(dto);
  },
  async remove(id: string): Promise<void> {
    await httpDelete(`${BFF_ENDPOINTS.icons}/${encodeURIComponent(id)}`);
  },
  /**
   * The Worker has no explicit "join this translation group" input — its
   * createIcon auto-joins `translation_group_id` by matching `slug`
   * against an existing row (see lib/d1/repositories/icons.ts). So a new
   * translation is just a plain create with the same slug and a different
   * language; `groupId` isn't needed by the Worker call itself, only by
   * the caller (icons/new/page.tsx) to know it's in "add translation" mode.
   */
  async createTranslation(_groupId: string, language: string, values: IconFormValues): Promise<Icon> {
    const dto = await httpPost<BffIconDto>(BFF_ENDPOINTS.icons, toPayload({ ...values, language: language as IconFormValues["language"] }));
    return toEntity(dto);
  },
};
