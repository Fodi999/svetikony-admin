/**
 * The stable BFF contract for Prayers. Same split as Alphabet
 * (app/api/bff/alphabet/_contract.ts): this file only decides WHICH fields
 * leave the server (whitelist/rename, no reinterpretation); HOW to
 * interpret them (enum fallbacks, JSON-shape validation, null/"" ->
 * undefined) belongs entirely to lib/api/http/prayers.ts's toEntity(), same
 * split as Alphabet.
 *
 * Rule: Worker can change. This BFF contract must stay stable. The browser
 * (and HttpApiAdapter) only ever sees BffPrayerDto, never the raw Worker row.
 */

/** Mirrors lib/d1/repositories/prayers.ts's ChurchPrayerDto in svet-ikony —
 * confirmed via curl against the local dev server (Stage 2C, Prayers READ).
 * `sceneTimeline`/`subtitleCues` are typed `unknown` here on purpose: the
 * Worker already JSON-parses them (fromD1Json) before returning, but their
 * runtime shape is not guaranteed to match admin's SceneTimelineEvent[] /
 * SubtitleCue[] — real local data currently has neither shape (see
 * lib/api/http/prayers.ts). Validating that is a "how to interpret"
 * decision, so it happens there, not here. */
export interface WorkerPrayerDto {
  id: string;
  siteId: string;
  iconId: string | null;
  calendarDayId: string | null;
  slug: string;
  title: string;
  text: string;
  audioUrl: string;
  qrCodeUrl: string;
  imageUrl: string;
  source: string;
  sourceUrl: string;
  note: string;
  language: string;
  prayerType: string;
  translationGroupId: string;
  status: string;
  isGlobal: boolean;
  visualizerEnabled: boolean;
  visualizerImageUrl: string;
  particleCountDesktop: number;
  particleCountMobile: number;
  particleSize: number;
  particleColorMode: string;
  backgroundColor: string;
  audioReactivity: number;
  sceneTimeline: unknown;
  subtitleCues: unknown;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fields deliberately dropped here and never sent to the browser: `siteId`,
 * `translationGroupId` (admin's Prayer entity isn't Translatable — no
 * per-language grouping concept exists for prayers), `isGlobal`, `status`
 * is kept (admin's Prayer.status is a real, used field, unlike Alphabet
 * which has no status at all).
 */
export interface BffPrayerDto {
  id: string;
  iconId: string | null;
  calendarDayId: string | null;
  slug: string;
  title: string;
  text: string;
  audioUrl: string;
  qrCodeUrl: string;
  imageUrl: string;
  source: string;
  sourceUrl: string;
  note: string;
  language: string;
  prayerType: string;
  status: string;
  visualizerEnabled: boolean;
  visualizerImageUrl: string;
  particleCountDesktop: number;
  particleCountMobile: number;
  particleSize: number;
  particleColorMode: string;
  backgroundColor: string;
  audioReactivity: number;
  sceneTimeline: unknown;
  subtitleCues: unknown;
  createdAt: string;
  updatedAt: string;
}

export function toBffPrayerDto(worker: WorkerPrayerDto): BffPrayerDto {
  return {
    id: worker.id,
    iconId: worker.iconId,
    calendarDayId: worker.calendarDayId,
    slug: worker.slug,
    title: worker.title,
    text: worker.text,
    audioUrl: worker.audioUrl,
    qrCodeUrl: worker.qrCodeUrl,
    imageUrl: worker.imageUrl,
    source: worker.source,
    sourceUrl: worker.sourceUrl,
    note: worker.note,
    language: worker.language,
    prayerType: worker.prayerType,
    status: worker.status,
    visualizerEnabled: worker.visualizerEnabled,
    visualizerImageUrl: worker.visualizerImageUrl,
    particleCountDesktop: worker.particleCountDesktop,
    particleCountMobile: worker.particleCountMobile,
    particleSize: worker.particleSize,
    particleColorMode: worker.particleColorMode,
    backgroundColor: worker.backgroundColor,
    audioReactivity: worker.audioReactivity,
    sceneTimeline: worker.sceneTimeline,
    subtitleCues: worker.subtitleCues,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffPrayerDtoList(workers: WorkerPrayerDto[]): BffPrayerDto[] {
  return workers.map(toBffPrayerDto);
}
