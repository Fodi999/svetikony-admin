import type { z } from "zod";
import type { BffChurchInfoDto, WorkerChurchInfoTranslation, WorkerChurchInfoWritePayload } from "@/app/api/bff/church-info/_contract";
import type { ChurchInfoApi } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { httpGet, httpPut } from "@/lib/api/http/transport";
import { contentStatusSchema } from "@/lib/validation/common";
import type { ChurchInfoFormValues } from "@/lib/validation/church-info.schema";
import type { ChurchInfo, ChurchInfoTranslation, ContentStatus, Language } from "@/types/entities";

function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

function toTranslation(worker: WorkerChurchInfoTranslation | undefined): ChurchInfoTranslation {
  return {
    title: worker?.title ?? "",
    description: worker?.description ?? "",
    schedule: worker?.schedule ?? "",
    dedication: worker?.dedication ?? "",
    shrines: worker?.shrines ?? "",
    priest: worker?.priest ?? "",
  };
}

/**
 * BFF DTO -> admin entity. Field-for-field with the real backend (see
 * _contract.ts's doc comment) — `id`/`createdAt`/`updatedAt` are carried
 * through even though the admin form never edits them, purely so the
 * singleton's real identity/timestamps are visible for debugging; nothing
 * in the UI branches on `id` (there is no `[id]` route to need it for).
 */
function toEntity(dto: BffChurchInfoDto): ChurchInfo {
  const languages: Language[] = ["uk", "ru", "en"];
  const translations = Object.fromEntries(
    languages.map((lang) => [lang, toTranslation(dto.translations[lang])]),
  ) as Record<Language, ChurchInfoTranslation>;

  return {
    id: dto.id,
    address: dto.address,
    mapsUrl: dto.mapsUrl || undefined,
    phoneOrSite: dto.phoneOrSite || undefined,
    priestPhone: dto.priestPhone || undefined,
    imageUrl: dto.imageUrl || undefined,
    status: safeEnum<ContentStatus>(contentStatusSchema, dto.status, "draft"),
    translations,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Admin form -> Worker write payload. Always sends every field the form
 * owns (never a partial diff): svet-ikony's real putChurchInfo() treats
 * any OMITTED field as an explicit reset to '' / 'draft' / etc, not
 * "leave unchanged" (verified directly in its source — see the Phase
 * 2B-4 report's ZERO-ROW / FIRST-SAVE SEMANTICS section) — react-hook-
 * form's `getValues()` already returns the complete FormValues object on
 * every submit, so this naturally satisfies that requirement as long as
 * every field below is always present, which it is.
 */
function toPayload(values: ChurchInfoFormValues): WorkerChurchInfoWritePayload {
  return {
    address: values.address,
    mapsUrl: values.mapsUrl,
    phoneOrSite: values.phoneOrSite,
    priestPhone: values.priestPhone,
    imageUrl: values.imageUrl,
    status: values.status,
    translations: {
      uk: values.translations.uk,
      ru: values.translations.ru,
      en: values.translations.en,
    },
  };
}

export const churchInfoHttpResource: ChurchInfoApi = {
  async get(): Promise<ChurchInfo> {
    const dto = await httpGet<BffChurchInfoDto>(BFF_ENDPOINTS.churchInfo);
    return toEntity(dto);
  },
  async update(values: ChurchInfoFormValues): Promise<ChurchInfo> {
    const dto = await httpPut<BffChurchInfoDto>(BFF_ENDPOINTS.churchInfo, toPayload(values));
    return toEntity(dto);
  },
};
