import type { z } from "zod";
import type { BffIconAiFillResultDto, BffIconAiWriteResultDto, BffIconDto, WorkerIconWritePayload } from "@/app/api/bff/icons/_contract";
import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import { httpDelete, httpPost, httpPut } from "@/lib/api/http/transport";
import { contentStatusSchema, languageSchema } from "@/lib/validation/common";
import type { IconFormValues } from "@/lib/validation/icon.schema";
import type { ContentStatus, Icon, IconAiFillResult, IconAiWriteResult, Language } from "@/types/entities";

/** Same defensive pattern as Calendar Day/Prayers: fall back rather than
 * an unchecked cast if the Worker's value doesn't match the admin's enum. */
function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

/**
 * BFF DTO -> admin entity mapping. `galleryImageIds` maps to the Worker's
 * real `gallery_urls` column (added by migration 0005, alongside the
 * pre-existing single `image_url`) — a proper photo gallery, same shape as
 * Product's. `relatedPrayerIds`/`relatedArticleIds` are deliberately always
 * []: that relation is inverted — `church_prayers`/`church_articles` each
 * carry their own `icon_id` FK pointing at this row, not the other way
 * around — same deferral as Calendar Day's related* fields in Stage 2H.
 * `calendarDayId` (singular) IS real and maps straight through, same
 * treatment as Prayers/Gospel's own calendarDayId. `history`/
 * `saintImageDescription`/`materials`/`dimensions` (migration 0024) now
 * have a real Worker column each and round-trip like every other field
 * here — previously these were hardcoded to `undefined`, which silently
 * discarded anything typed into those form fields on save.
 */
export function toEntity(dto: BffIconDto): Icon {
  return {
    id: dto.id,
    translationGroupId: dto.translationGroupId,
    language: safeEnum<Language>(languageSchema, dto.language, "uk"),
    slug: dto.slug,
    title: dto.title,
    description: dto.description,
    history: dto.history ?? undefined,
    saintImageDescription: dto.saintImageDescription ?? undefined,
    materials: dto.materials ?? undefined,
    dimensions: dto.dimensions ?? undefined,
    mainImageId: dto.imageUrl || undefined,
    galleryImageIds: dto.galleryUrls,
    relatedPrayerIds: [],
    relatedArticleIds: [],
    calendarDayId: dto.calendarDayId ?? undefined,
    status: safeEnum<ContentStatus>(contentStatusSchema, dto.status, "draft"),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Admin form -> Worker write payload. Only fields the Worker's
 * ChurchIconPayload accepts that the admin form actually edits — see
 * toEntity()'s doc comment for what's deliberately not sent. */
export function toPayload(values: IconFormValues): WorkerIconWritePayload {
  return {
    title: values.title,
    slug: values.slug,
    language: values.language,
    description: values.description,
    imageUrl: values.mainImageId ?? "",
    galleryUrls: values.galleryImageIds,
    status: values.status,
    calendarDayId: values.calendarDayId || null,
    history: values.history ?? null,
    saintImageDescription: values.saintImageDescription ?? null,
    materials: values.materials ?? null,
    dimensions: values.dimensions ?? null,
  };
}

function aiActionPath(id: string, action: string): string {
  return `${BFF_ENDPOINTS.icons}/${encodeURIComponent(id)}/${action}`;
}

/** Shared by every generate/regenerate Icon AI action: a DRAFT icon's
 * result carries the written entity; a PUBLISHED icon's carries the
 * still-unchanged entity plus a pending proposal id -- see
 * IconAiWriteResult's own doc comment. */
function toAiWriteResult(dto: BffIconAiWriteResultDto): IconAiWriteResult {
  return dto.mode === "direct" ? { mode: "direct", icon: toEntity(dto.icon) } : { mode: "proposal", icon: toEntity(dto.icon), proposalId: dto.proposalId };
}

/** Same reasoning as Calendar Day's own AI_TEXT_TIMEOUT_MS: the BFF's own
 * matching timeout (see app/api/bff/icons/[id]/*\/route.ts) is 120s, so
 * this must stay slightly above it so the BFF's clean timeout response
 * always wins over the browser's fetch aborting first. */
const AI_TEXT_TIMEOUT_MS = 125_000;

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
  async generateDescription(id: string): Promise<IconAiWriteResult> {
    return toAiWriteResult(await httpPost<BffIconAiWriteResultDto>(aiActionPath(id, "generate-description"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async regenerateDescription(id: string): Promise<IconAiWriteResult> {
    return toAiWriteResult(await httpPost<BffIconAiWriteResultDto>(aiActionPath(id, "regenerate-description"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async generateHistory(id: string): Promise<IconAiWriteResult> {
    return toAiWriteResult(await httpPost<BffIconAiWriteResultDto>(aiActionPath(id, "generate-history"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async regenerateHistory(id: string): Promise<IconAiWriteResult> {
    return toAiWriteResult(await httpPost<BffIconAiWriteResultDto>(aiActionPath(id, "regenerate-history"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async generateSaintImageDescription(id: string): Promise<IconAiWriteResult> {
    return toAiWriteResult(await httpPost<BffIconAiWriteResultDto>(aiActionPath(id, "generate-saint-image-description"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async regenerateSaintImageDescription(id: string): Promise<IconAiWriteResult> {
    return toAiWriteResult(await httpPost<BffIconAiWriteResultDto>(aiActionPath(id, "regenerate-saint-image-description"), undefined, AI_TEXT_TIMEOUT_MS));
  },
  async fillMissing(id: string): Promise<IconAiFillResult> {
    const dto = await httpPost<BffIconAiFillResultDto>(aiActionPath(id, "fill-missing"), undefined, AI_TEXT_TIMEOUT_MS);
    return dto.mode === "direct"
      ? { mode: "direct", icon: toEntity(dto.icon), filled: dto.filled, skipped: dto.skipped }
      : { mode: "proposal", icon: toEntity(dto.icon), proposalId: dto.proposalId, proposedFields: dto.proposedFields, skipped: dto.skipped };
  },
};
