import type { z } from "zod";
import type { BffCalendarDayDto, WorkerCalendarDayWritePayload } from "@/app/api/bff/calendar-days/_contract";
import type { ApiClient, CalendarQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import { contentStatusSchema, languageSchema } from "@/lib/validation/common";
import { calendarEventTypeSchema, type CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { CalendarDay, CalendarEventType, ContentStatus, Language } from "@/types/entities";

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
  };
}

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
};
