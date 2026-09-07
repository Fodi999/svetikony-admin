import type { z } from "zod";
import type { BffGospelDto, WorkerGospelWritePayload } from "@/app/api/bff/gospel/_contract";
import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import { contentStatusSchema, languageSchema } from "@/lib/validation/common";
import type { GospelReadingFormValues } from "@/lib/validation/gospel.schema";
import type { ContentStatus, GospelReading, Language } from "@/types/entities";

/** Same defensive pattern as Calendar Day/Prayers/Icons/Saints/Articles:
 * fall back rather than an unchecked cast if the Worker's value doesn't
 * match the admin's enum. */
function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

/**
 * BFF DTO -> admin entity mapping.
 *
 * `translationGroupId` synthesized as the reading's own id — same
 * reasoning as Articles' toEntity(): church_gospel_readings has no
 * translation_group_id column, and no Gospel UI anywhere reads/displays
 * this field (grepped directly), so each reading standing in as its own
 * singleton group is an honest placeholder, not a claim of real grouping.
 *
 * `calendarDayId` maps straight through as a single relation — the real
 * schema has exactly this singular FK. The admin form now edits it as a
 * single select (see toPayload below), replacing the old plural
 * relatedCalendarDayIds picker, which the real backend could never fully
 * honor (same fix as Articles' relatedIconIds -> iconId).
 */
function toEntity(dto: BffGospelDto): GospelReading {
  return {
    id: dto.id,
    translationGroupId: dto.id,
    language: safeEnum<Language>(languageSchema, dto.language, "uk"),
    title: dto.title,
    slug: dto.slug,
    reference: dto.reference,
    text: dto.text,
    explanation: dto.explanation || undefined,
    status: safeEnum<ContentStatus>(contentStatusSchema, dto.status, "draft"),
    calendarDayId: dto.calendarDayId ?? undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Admin form -> Worker write payload. Every field the form edits has a
 * real column to write to — nothing silently dropped. */
function toPayload(values: GospelReadingFormValues): WorkerGospelWritePayload {
  return {
    title: values.title,
    slug: values.slug,
    language: values.language,
    reference: values.reference,
    text: values.text,
    explanation: values.explanation ?? "",
    status: values.status,
    calendarDayId: values.calendarDayId || null,
  };
}

const baseResource = createHttpListResource<BffGospelDto, GospelReading, TranslatableQuery>({
  listPath: BFF_ENDPOINTS.gospelReadings,
  itemPath: (id) => `${BFF_ENDPOINTS.gospelReadings}/${encodeURIComponent(id)}`,
  toEntity,
  filter: (reading, query) => (!query?.status || reading.status === query.status) && (!query?.language || reading.language === query.language),
  searchFields: (reading) => [reading.title, reading.reference, reading.slug],
  sort: (a, b) => a.title.localeCompare(b.title),
});

export const gospelReadingsHttpResource: ApiClient["gospelReadings"] = {
  ...baseResource,
  async create(values: GospelReadingFormValues): Promise<GospelReading> {
    const dto = await httpPost<BffGospelDto>(BFF_ENDPOINTS.gospelReadings, toPayload(values));
    return toEntity(dto);
  },
  async update(id: string, values: GospelReadingFormValues): Promise<GospelReading> {
    const dto = await httpPut<BffGospelDto>(`${BFF_ENDPOINTS.gospelReadings}/${encodeURIComponent(id)}`, toPayload(values));
    return toEntity(dto);
  },
  async remove(id: string): Promise<void> {
    await httpDelete(`${BFF_ENDPOINTS.gospelReadings}/${encodeURIComponent(id)}`);
  },
  // createTranslation intentionally left as the shared factory's default
  // (throws a controlled not_implemented error) — same reasoning as
  // Articles: no translation_group_id, no slug-based auto-join precedent,
  // and no Gospel UI anywhere calls this today.
};
