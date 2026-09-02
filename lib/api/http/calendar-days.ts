import type { z } from "zod";
import type { BffCalendarAiFillResultDto, BffCalendarDayDto, WorkerCalendarDayWritePayload } from "@/app/api/bff/calendar-days/_contract";
import type { ApiClient, CalendarQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import { contentStatusSchema, languageSchema } from "@/lib/validation/common";
import { calendarEventTypeSchema, type CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { CalendarAiFillResult, CalendarDay, CalendarEventType, ContentStatus, Language } from "@/types/entities";

/**
 * Real local data has `dayType` values mirrored from the old Rust backend
 * (saint/feast/fasting/gospel/quiet — see the Stage 2H migration's
 * comment) that don't match the admin's own taxonomy
 * (feast/fast/memorial/liturgical/civil). Rather than an unchecked cast,
 * fall back the same way lib/api/http/prayers.ts does for its enum
 * mismatches.
 */
function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

/**
 * BFF DTO -> admin entity mapping. `relatedIconIds`/`relatedPrayerIds`/
 * `relatedSaintIds`/`relatedGospelIds` are deliberately always `[]`: the
 * real D1 schema models this relation in the opposite direction (each of
 * those tables carries its own `calendarDayId` FK pointing at this row,
 * not the other way around), so there is nothing on this DTO to read them
 * from. Wiring that up would mean writing to four other modules' tables
 * from this form — out of scope for Stage 2H, not requested. The fields
 * stay mock-only/UI-only in real mode.
 */
function toEntity(dto: BffCalendarDayDto): CalendarDay {
  return {
    id: dto.id,
    translationGroupId: dto.translationGroupId,
    language: safeEnum<Language>(languageSchema, dto.language, "uk"),
    date: dto.dateNewStyle || dto.dateOldStyle || "",
    title: dto.title,
    slug: dto.slug,
    shortDescription: dto.description,
    history: dto.history || undefined,
    eventType: safeEnum<CalendarEventType>(calendarEventTypeSchema, dto.dayType, "feast"),
    status: safeEnum<ContentStatus>(contentStatusSchema, dto.status, "draft"),
    imageId: dto.imageUrl || undefined,
    seoTitle: dto.seoTitle,
    seoDescription: dto.seoDescription,
    imageMetadata: dto.imageMetadata,
    relatedIconIds: [],
    relatedPrayerIds: [],
    relatedSaintIds: [],
    relatedGospelIds: [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Admin form -> Worker write payload. Only fields the Worker's
 * ChurchCalendarDayPayload accepts; `relatedIconIds` etc. are not sent —
 * see toEntity()'s doc comment for why. */
function toPayload(values: CalendarDayFormValues): WorkerCalendarDayWritePayload {
  return {
    dateNewStyle: values.date,
    calendarType: "both",
    title: values.title,
    slug: values.slug,
    language: values.language,
    dayType: values.eventType,
    description: values.shortDescription,
    history: values.history ?? "",
    imageUrl: values.imageId ?? "",
    status: values.status,
    seoTitle: values.seoTitle ?? null,
    seoDescription: values.seoDescription ?? null,
  };
}

function aiActionPath(id: string, action: string): string {
  return `${BFF_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/${action}`;
}

/**
 * The transport-layer default (10s, see lib/api/http/transport.ts) is fine
 * for ordinary CRUD, but real OpenAI calls routinely take longer: a text
 * completion (description/history/SEO) is usually a few seconds but can
 * spike under load; an image generation call commonly takes 20-40s;
 * fill-missing can chain up to 4 text calls plus one image call in a
 * single request. These must stay slightly ABOVE the matching BFF-side
 * timeouts (see app/api/bff/calendar-days/[id]/*\/route.ts) so the BFF's
 * own clean timeout response always wins over the browser's fetch aborting
 * first -- otherwise the admin sees a raw client-side abort instead of a
 * proper error body.
 */
const AI_TEXT_TIMEOUT_MS = 35_000;
const AI_IMAGE_TIMEOUT_MS = 65_000;
const AI_FILL_MISSING_TIMEOUT_MS = 125_000;

/**
 * Backend supports `year`/`month` filters server-side but not
 * `language`/`status`/search/pagination — those are applied client-side by
 * the shared factory, matching the Prayers precedent.
 */
const baseResource = createHttpListResource<BffCalendarDayDto, CalendarDay, CalendarQuery>({
  listPath: BFF_ENDPOINTS.calendarDays,
  itemPath: (id) => `${BFF_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}`,
  toEntity,
  buildBackendParams: (query) => {
    const params = new URLSearchParams();
    if (query?.month) {
      const [year, month] = query.month.split("-");
      if (year) params.set("year", year);
      if (month) params.set("month", month);
    }
    return params;
  },
  filter: (day, query) =>
    (!query?.status || day.status === query.status) && (!query?.language || day.language === query.language),
  searchFields: (day) => [day.title, day.slug],
  sort: (a, b) => a.date.localeCompare(b.date),
});

export const calendarDaysHttpResource: ApiClient["calendarDays"] = {
  ...baseResource,
  async create(values: CalendarDayFormValues): Promise<CalendarDay> {
    const dto = await httpPost<BffCalendarDayDto>(BFF_ENDPOINTS.calendarDays, toPayload(values));
    return toEntity(dto);
  },
  async update(id: string, values: CalendarDayFormValues): Promise<CalendarDay> {
    const dto = await httpPut<BffCalendarDayDto>(`${BFF_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}`, toPayload(values));
    return toEntity(dto);
  },
  async remove(id: string): Promise<void> {
    await httpDelete(`${BFF_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}`);
  },
  async generateDescription(id: string): Promise<CalendarDay> {
    return toEntity(await httpPost<BffCalendarDayDto>(aiActionPath(id, "generate-description"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async regenerateDescription(id: string): Promise<CalendarDay> {
    return toEntity(await httpPost<BffCalendarDayDto>(aiActionPath(id, "regenerate-description"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async generateHistory(id: string): Promise<CalendarDay> {
    return toEntity(await httpPost<BffCalendarDayDto>(aiActionPath(id, "generate-history"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async regenerateHistory(id: string): Promise<CalendarDay> {
    return toEntity(await httpPost<BffCalendarDayDto>(aiActionPath(id, "regenerate-history"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async generateSeo(id: string): Promise<CalendarDay> {
    return toEntity(await httpPost<BffCalendarDayDto>(aiActionPath(id, "generate-seo"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async regenerateSeo(id: string): Promise<CalendarDay> {
    return toEntity(await httpPost<BffCalendarDayDto>(aiActionPath(id, "regenerate-seo"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async generateImage(id: string): Promise<CalendarDay> {
    return toEntity(await httpPost<BffCalendarDayDto>(aiActionPath(id, "generate-image"), undefined, AI_IMAGE_TIMEOUT_MS));
  },
  async regenerateImage(id: string): Promise<CalendarDay> {
    return toEntity(await httpPost<BffCalendarDayDto>(aiActionPath(id, "regenerate-image"), undefined, AI_IMAGE_TIMEOUT_MS));
  },
  async assignImage(id: string, imageUrl: string): Promise<CalendarDay> {
    return toEntity(await httpPut<BffCalendarDayDto>(aiActionPath(id, "image"), { imageUrl }));
  },
  async generateImageFromPrompt(id: string, prompt: string): Promise<CalendarDay> {
    return toEntity(await httpPost<BffCalendarDayDto>(aiActionPath(id, "generate-image-prompt"), { prompt }, AI_IMAGE_TIMEOUT_MS));
  },
  async fillMissing(id: string): Promise<CalendarAiFillResult> {
    const dto = await httpPost<BffCalendarAiFillResultDto>(aiActionPath(id, "fill-missing"), undefined, AI_FILL_MISSING_TIMEOUT_MS);
    return { day: toEntity(dto.day), filled: dto.filled, skipped: dto.skipped };
  },
};
