import type { z } from "zod";
import type { BffVisualizerEventDto, WorkerVisualizerEventWritePayload } from "@/app/api/bff/visualizer-events/_contract";
import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import { contentStatusSchema, languageSchema } from "@/lib/validation/common";
import type { VisualizerEventFormValues } from "@/lib/validation/visualizer-event.schema";
import type { ContentStatus, Language, VisualizerEvent } from "@/types/entities";

/** Same defensive pattern as every other module: fall back rather than an
 * unchecked cast if the Worker's value doesn't match the admin's enum. */
function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

function toEntity(dto: BffVisualizerEventDto): VisualizerEvent {
  return {
    id: dto.id,
    translationGroupId: dto.translationGroupId,
    language: safeEnum<Language>(languageSchema, dto.language, "uk"),
    slug: dto.slug,
    title: dto.title,
    summary: dto.summary || undefined,
    description: dto.description || undefined,
    eventType: dto.eventType as VisualizerEvent["eventType"],
    chronologyType: dto.chronologyType as VisualizerEvent["chronologyType"],
    era: dto.era as VisualizerEvent["era"],
    calendarEra: dto.calendarEra as VisualizerEvent["calendarEra"],
    yearStart: dto.yearStart ?? undefined,
    yearEnd: dto.yearEnd ?? undefined,
    century: dto.century ?? undefined,
    sortYear: dto.sortYear,
    displayDate: dto.displayDate || undefined,
    locationName: dto.locationName || undefined,
    latitude: dto.latitude ?? undefined,
    longitude: dto.longitude ?? undefined,
    calendarDayId: dto.calendarDayId ?? undefined,
    status: safeEnum<ContentStatus>(contentStatusSchema, dto.status, "draft"),
    isFeatured: dto.isFeatured,
    publishedAt: dto.publishedAt ?? undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function toPayload(values: VisualizerEventFormValues): WorkerVisualizerEventWritePayload {
  return {
    slug: values.slug,
    language: values.language,
    title: values.title,
    summary: values.summary ?? "",
    description: values.description ?? "",
    eventType: values.eventType,
    chronologyType: values.chronologyType,
    era: values.era,
    calendarEra: values.calendarEra,
    yearStart: values.yearStart ?? null,
    yearEnd: values.yearEnd ?? null,
    century: values.century ?? null,
    sortYear: values.sortYear,
    calendarDayId: values.calendarDayId || null,
    displayDate: values.displayDate ?? "",
    locationName: values.locationName ?? "",
    latitude: values.latitude ?? null,
    longitude: values.longitude ?? null,
    status: values.status,
    isFeatured: values.isFeatured,
  };
}

const baseResource = createHttpListResource<BffVisualizerEventDto, VisualizerEvent, TranslatableQuery>({
  listPath: BFF_ENDPOINTS.visualizerEvents,
  itemPath: (id) => `${BFF_ENDPOINTS.visualizerEvents}/${encodeURIComponent(id)}`,
  toEntity,
  buildBackendParams: (query) => {
    const params = new URLSearchParams();
    if (query?.language) params.set("language", query.language);
    if (query?.status) params.set("status", query.status);
    return params;
  },
  searchFields: (event) => [event.title, event.slug, event.locationName],
  sort: (a, b) => (a.sortYear ?? (a.calendarEra === "BC" ? -1 : 1) * (a.yearStart ?? 0)) - (b.sortYear ?? (b.calendarEra === "BC" ? -1 : 1) * (b.yearStart ?? 0)),
});

export const visualizerEventsHttpResource: ApiClient["visualizerEvents"] = {
  ...baseResource,
  async create(values: VisualizerEventFormValues): Promise<VisualizerEvent> {
    const dto = await httpPost<BffVisualizerEventDto>(BFF_ENDPOINTS.visualizerEvents, toPayload(values));
    return toEntity(dto);
  },
  async update(id: string, values: VisualizerEventFormValues): Promise<VisualizerEvent> {
    const dto = await httpPut<BffVisualizerEventDto>(`${BFF_ENDPOINTS.visualizerEvents}/${encodeURIComponent(id)}`, toPayload(values));
    return toEntity(dto);
  },
  async remove(id: string): Promise<void> {
    await httpDelete(`${BFF_ENDPOINTS.visualizerEvents}/${encodeURIComponent(id)}`);
  },
  /** Same slug-matching auto-join as Icons/Saints/Alphabet — the Worker's
   * createVisualizerEvent inherits translation_group_id from an existing
   * row with the same slug, so a new translation is just a plain create
   * with the same slug and a different language. */
  async createTranslation(_groupId: string, language: string, values: VisualizerEventFormValues): Promise<VisualizerEvent> {
    const dto = await httpPost<BffVisualizerEventDto>(
      BFF_ENDPOINTS.visualizerEvents,
      toPayload({ ...values, language: language as VisualizerEventFormValues["language"] }),
    );
    return toEntity(dto);
  },
};
