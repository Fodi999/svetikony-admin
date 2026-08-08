import type { z } from "zod";
import type { BffSaintDto, WorkerSaintWritePayload } from "@/app/api/bff/saints/_contract";
import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import { contentStatusSchema, languageSchema } from "@/lib/validation/common";
import type { SaintFormValues } from "@/lib/validation/saint.schema";
import type { ContentStatus, Language, Saint } from "@/types/entities";

/** Same defensive pattern as Calendar Day/Prayers/Icons: fall back rather
 * than an unchecked cast if the Worker's value doesn't match the admin's
 * enum. */
function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

/**
 * BFF DTO -> admin entity mapping. `relatedIconIds`/`relatedCalendarDayIds`
 * are deliberately always []: the admin picks MANY icons/calendar days per
 * saint via a relation picker, but the real D1 schema only has a single
 * `icon_id`/`calendar_day_id` FK per saint (the inverse of what the picker
 * needs) — same deferral as Calendar Day's related* fields in Stage 2H.
 */
function toEntity(dto: BffSaintDto): Saint {
  return {
    id: dto.id,
    translationGroupId: dto.translationGroupId,
    language: safeEnum<Language>(languageSchema, dto.language, "uk"),
    name: dto.name,
    slug: dto.slug,
    shortDescription: dto.shortDescription,
    biography: dto.biography,
    feastDay: dto.feastDay || undefined,
    imageId: dto.imageUrl || undefined,
    status: safeEnum<ContentStatus>(contentStatusSchema, dto.status, "draft"),
    relatedIconIds: [],
    relatedCalendarDayIds: [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Admin form -> Worker write payload. Only fields the Worker's
 * ChurchSaintPayload accepts that the admin form actually edits — see
 * toEntity()'s doc comment for what's deliberately not sent. */
function toPayload(values: SaintFormValues): WorkerSaintWritePayload {
  return {
    name: values.name,
    slug: values.slug,
    language: values.language,
    shortDescription: values.shortDescription,
    biography: values.biography,
    feastDay: values.feastDay ?? "",
    imageUrl: values.imageId ?? "",
    status: values.status,
  };
}

const baseResource = createHttpListResource<BffSaintDto, Saint, TranslatableQuery>({
  listPath: BFF_ENDPOINTS.saints,
  itemPath: (id) => `${BFF_ENDPOINTS.saints}/${encodeURIComponent(id)}`,
  toEntity,
  filter: (saint, query) => (!query?.status || saint.status === query.status) && (!query?.language || saint.language === query.language),
  searchFields: (saint) => [saint.name, saint.slug],
  sort: (a, b) => a.name.localeCompare(b.name),
});

export const saintsHttpResource: ApiClient["saints"] = {
  ...baseResource,
  async create(values: SaintFormValues): Promise<Saint> {
    const dto = await httpPost<BffSaintDto>(BFF_ENDPOINTS.saints, toPayload(values));
    return toEntity(dto);
  },
  async update(id: string, values: SaintFormValues): Promise<Saint> {
    const dto = await httpPut<BffSaintDto>(`${BFF_ENDPOINTS.saints}/${encodeURIComponent(id)}`, toPayload(values));
    return toEntity(dto);
  },
  async remove(id: string): Promise<void> {
    await httpDelete(`${BFF_ENDPOINTS.saints}/${encodeURIComponent(id)}`);
  },
  /**
   * Same slug-matching auto-join as Icons (lib/api/http/icons.ts) — the
   * Worker's createSaint inherits translation_group_id from an existing
   * row with the same slug, so a new translation is just a plain create
   * with the same slug and a different language.
   */
  async createTranslation(_groupId: string, language: string, values: SaintFormValues): Promise<Saint> {
    const dto = await httpPost<BffSaintDto>(BFF_ENDPOINTS.saints, toPayload({ ...values, language: language as SaintFormValues["language"] }));
    return toEntity(dto);
  },
};
