import type { AutopostContentType } from "@/types/entities";

/** Mirrors lib/telegram/content-plan.ts's ContentPlan* types in svet-ikony. */
export type WorkerContentPlanSlotStatus =
  | "SENT"
  | "SENDING"
  | "READY"
  | "DRAFT"
  | "SOURCE_READY"
  | "MISSING_SOURCE"
  | "REVIEW_REQUIRED"
  | "FAILED";

export interface WorkerContentPlanDeliveryPreview {
  kind: "text_only" | "photo_with_caption" | "photo_then_text" | "audio_then_text" | "photo_and_audio_then_text";
  photoCaption: string | null;
  audioCaption: string | null;
}

export interface WorkerContentPlanSlotDto {
  contentType: AutopostContentType;
  scheduledTime: string;
  sourceStatus: "available" | "missing_source" | "insufficient_data";
  verificationStatus: "verified" | "failed" | null;
  publicationStatus: WorkerContentPlanSlotStatus;
  textAvailable: boolean;
  imageAvailable: boolean;
  /** Manually-assigned audio (svet-ikony migration 0012) -- never a
   * "source" fallback, unlike imageAvailable (see the Worker's own doc
   * comment on this field). */
  audioAvailable: boolean;
  sentAt: string | null;
  telegramMessageId: number | null;
  errorMessage: string | null;
  textPreview?: string;
  imageUrl?: string;
  /** Detail-only, same reasoning as imageUrl. */
  audioUrl?: string;
  /** Detail-only, from buildContentPlanDayDetail() -- never present in the
   * bulk year/range list. */
  fullText?: string;
  deliveryPreview?: WorkerContentPlanDeliveryPreview;
}

export interface WorkerContentPlanDayDto {
  civilDate: string;
  julianDate: string;
  calendarTitle: string | null;
  calendarDayId: string | null;
  slots: Record<AutopostContentType, WorkerContentPlanSlotDto>;
}

export interface WorkerContentPlanSummaryDto {
  totalDays: number;
  sent: number;
  ready: number;
  draft: number;
  sourceReady: number;
  missingSource: number;
  reviewRequired: number;
  failed: number;
  coverage: Record<AutopostContentType, { available: number; missing: number }>;
}

export interface WorkerContentPlanReportDto {
  generatedAt: string;
  fromCivilDate: string;
  toCivilDate: string;
  days: WorkerContentPlanDayDto[];
  summary: WorkerContentPlanSummaryDto;
}

export type BffContentPlanReportDto = WorkerContentPlanReportDto;
export type BffContentPlanDayDto = WorkerContentPlanDayDto;

export function toBffContentPlanReportDto(worker: WorkerContentPlanReportDto): BffContentPlanReportDto {
  return worker;
}

export function toBffContentPlanDayDto(worker: WorkerContentPlanDayDto): BffContentPlanDayDto {
  return worker;
}

/** Mirrors lib/telegram/content-plan-actions.ts's PrepareDayReport in
 * svet-ikony -- see the "Підготувати весь день" action. */
export type WorkerPrepareDaySlotOutcome =
  | "prepared"
  | "already_prepared"
  | "skipped_ready"
  | "skipped_sent"
  | "skipped_sending"
  | "missing_source"
  | "review_required"
  | "image_failed"
  | "failed";

export interface WorkerPrepareDayReportDto {
  date: string;
  total: number;
  prepared: number;
  alreadyPrepared: number;
  skippedReady: number;
  skippedSent: number;
  skippedSending: number;
  missingSource: number;
  reviewRequired: number;
  imageFailed: number;
  failed: number;
  results: { contentType: AutopostContentType; result: WorkerPrepareDaySlotOutcome; error?: string }[];
}

export type BffPrepareDayReportDto = WorkerPrepareDayReportDto;

export function toBffPrepareDayReportDto(worker: WorkerPrepareDayReportDto): BffPrepareDayReportDto {
  return worker;
}
