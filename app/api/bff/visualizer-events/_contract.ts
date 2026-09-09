/**
 * The stable BFF contract for Visualizer Events. Worker DTO -> BFF DTO here
 * is pure field whitelisting — no semantic decisions (enum fallbacks,
 * null/"" -> undefined). Those belong in lib/api/http/visualizer-events.ts's
 * toEntity()/toPayload(), matching the Alphabet/Saints precedent.
 *
 * Rule: Worker can change. This BFF contract must stay stable. The browser
 * (and HttpApiAdapter) only ever sees BffVisualizerEventDto, never the raw
 * Worker row.
 */

/** Mirrors svet-ikony's lib/d1/repositories/visualizerEvents.ts's
 * ChurchVisualizerEventDto exactly. Do not add fields here that aren't in
 * that type. */
export interface WorkerVisualizerEventDto {
  id: string;
  siteId: string;
  slug: string;
  language: string;
  translationGroupId: string;
  title: string;
  summary: string;
  description: string;
  eventType: string;
  chronologyType: string;
  era: string;
  calendarEra: string;
  yearStart: number | null;
  yearEnd: number | null;
  century: number | null;
  displayDate: string;
  sortYear: number;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  calendarDayId: string | null;
  status: string;
  isFeatured: boolean;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** Fields deliberately dropped here and never sent to the browser: `siteId`,
 * `isGlobal` — internal Worker/content-model fields with no admin use.
 * `sortYear` is also dropped — it's a machine-computed ordering key the
 * Worker derives automatically from yearStart/century/calendarEra (see
 * that repository's computeSortYearFromParts), never something an admin
 * edits directly. */
export interface BffVisualizerEventDto {
  id: string;
  slug: string;
  language: string;
  translationGroupId: string;
  title: string;
  summary: string;
  description: string;
  eventType: string;
  chronologyType: string;
  era: string;
  calendarEra: string;
  yearStart: number | null;
  yearEnd: number | null;
  century: number | null;
  displayDate: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  calendarDayId: string | null;
  status: string;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export function toBffVisualizerEventDto(worker: WorkerVisualizerEventDto): BffVisualizerEventDto {
  return {
    id: worker.id,
    slug: worker.slug,
    language: worker.language,
    translationGroupId: worker.translationGroupId,
    title: worker.title,
    summary: worker.summary,
    description: worker.description,
    eventType: worker.eventType,
    chronologyType: worker.chronologyType,
    era: worker.era,
    calendarEra: worker.calendarEra,
    yearStart: worker.yearStart,
    yearEnd: worker.yearEnd,
    century: worker.century,
    displayDate: worker.displayDate,
    locationName: worker.locationName,
    latitude: worker.latitude,
    longitude: worker.longitude,
    calendarDayId: worker.calendarDayId,
    status: worker.status,
    isFeatured: worker.isFeatured,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
    publishedAt: worker.publishedAt,
  };
}

export function toBffVisualizerEventDtoList(workers: WorkerVisualizerEventDto[]): BffVisualizerEventDto[] {
  return workers.map(toBffVisualizerEventDto);
}

/** Admin -> Worker payload for create/update. Same whitelist in reverse —
 * see BffVisualizerEventDto's doc comment for what's deliberately not
 * sent (sortYear is always Worker-computed). */
export interface WorkerVisualizerEventWritePayload {
  slug?: string;
  language?: string;
  title?: string;
  summary?: string;
  description?: string;
  eventType?: string;
  chronologyType?: string;
  era?: string;
  calendarEra?: string;
  yearStart?: number | null;
  yearEnd?: number | null;
  century?: number | null;
  displayDate?: string;
  locationName?: string;
  latitude?: number | null;
  longitude?: number | null;
  calendarDayId?: string | null;
  status?: string;
  isFeatured?: boolean;
}
