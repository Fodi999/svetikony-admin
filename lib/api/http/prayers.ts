import type { z } from "zod";
import type { BffPrayerDto } from "@/app/api/bff/prayers/_contract";
import type { ApiClient, TranslatableQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createHttpListResource } from "@/lib/api/http/resource-factory";
import {
  contentStatusSchema,
  languageSchema,
} from "@/lib/validation/common";
import {
  particleColorModeSchema,
  prayerTypeSchema,
  sceneTimelineEventSchema,
  subtitleCueSchema,
} from "@/lib/validation/prayer.schema";
import type { ContentStatus, Language, ParticleColorMode, Prayer, PrayerType, SceneTimelineEvent, SubtitleCue } from "@/types/entities";

/**
 * Real local data (curled against svet-ikony, Stage 2C) has `prayerType:
 * "prayer"` — not one of admin's 8 known PrayerType values — and
 * `particleColorMode: "silver_gold"` — not one of admin's 3 known
 * ParticleColorMode values. Rather than an unchecked `as PrayerType` cast
 * (which would silently produce a value the rest of the app assumes is
 * exhaustively handled), each is validated against the same Zod enum the
 * create/edit form already uses, falling back to a safe default when the
 * Worker's value doesn't match. This is a real, documented Worker/admin
 * mismatch, not a hypothetical edge case.
 */
function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

/**
 * `sceneTimeline`/`subtitleCues` are stored as opaque JSON in D1. Real local
 * data has `sceneTimeline: {idle,assemble,reveal,dissolve}` (a timing
 * config object, not an array of discrete events) and `subtitleCues:
 * [{t,text}]` (missing `id`/`startMs`/`endMs`). Neither matches admin's
 * SceneTimelineEvent[]/SubtitleCue[] shape, and there is no safe way to
 * invent the missing fields (id, startMs/endMs, atMs/label/intensity) — so
 * anything that doesn't validate is dropped rather than guessed. A single
 * malformed item never fails the whole field: each array entry is checked
 * independently.
 */
function parseSceneTimeline(raw: unknown): SceneTimelineEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is SceneTimelineEvent => sceneTimelineEventSchema.safeParse(item).success);
}

function parseSubtitleCues(raw: unknown): SubtitleCue[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is SubtitleCue => subtitleCueSchema.safeParse(item).success);
}

/**
 * BFF DTO -> admin entity mapping. Prayer has no Translatable
 * (translationGroupId) concept and no image-id-vs-url gap (Prayer.imageUrl
 * is already a plain URL in the admin model, unlike Alphabet's
 * mainImageId) — the only real gaps are the two enum mismatches and the two
 * JSON-shape mismatches documented above.
 */
function toEntity(dto: BffPrayerDto): Prayer {
  return {
    id: dto.id,
    title: dto.title,
    slug: dto.slug,
    text: dto.text,
    language: safeEnum<Language>(languageSchema, dto.language, "uk"),
    prayerType: safeEnum<PrayerType>(prayerTypeSchema, dto.prayerType, "general"),
    status: safeEnum<ContentStatus>(contentStatusSchema, dto.status, "draft"),
    iconId: dto.iconId ?? undefined,
    calendarDayId: dto.calendarDayId ?? undefined,
    audioUrl: dto.audioUrl || undefined,
    qrCodeUrl: dto.qrCodeUrl || undefined,
    imageUrl: dto.imageUrl || undefined,
    source: dto.source || undefined,
    sourceUrl: dto.sourceUrl || undefined,
    note: dto.note || undefined,
    visualizerEnabled: dto.visualizerEnabled,
    visualizerImageUrl: dto.visualizerImageUrl || undefined,
    particleCountDesktop: dto.particleCountDesktop,
    particleCountMobile: dto.particleCountMobile,
    particleSize: dto.particleSize,
    particleColorMode: safeEnum<ParticleColorMode>(particleColorModeSchema, dto.particleColorMode, "single"),
    backgroundColor: dto.backgroundColor,
    audioReactivity: dto.audioReactivity,
    sceneTimeline: parseSceneTimeline(dto.sceneTimeline),
    subtitleCues: parseSubtitleCues(dto.subtitleCues),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Backend supports a `language` filter server-side but no search/status
 * filter/pagination — search, status-filter, and pagination are done by the
 * shared factory to preserve the ApiClient contract and match what
 * features/prayers/prayer-list-view.tsx already sends (status is a real
 * query param there, unlike Alphabet).
 */
export const prayersHttpResource: ApiClient["prayers"] = createHttpListResource<BffPrayerDto, Prayer, TranslatableQuery>({
  listPath: BFF_ENDPOINTS.prayers,
  itemPath: (id) => `${BFF_ENDPOINTS.prayers}/${encodeURIComponent(id)}`,
  toEntity,
  buildBackendParams: (query) => {
    const params = new URLSearchParams();
    if (query?.language) params.set("language", query.language);
    return params;
  },
  filter: (prayer, query) => !query?.status || prayer.status === query.status,
  searchFields: (prayer) => [prayer.title, prayer.text, prayer.slug],
  sort: (a, b) => a.title.localeCompare(b.title),
});
