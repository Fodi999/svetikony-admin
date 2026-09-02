import type { AutopostContentType } from "@/types/entities";

/** Mirrors lib/telegram/content-plan.ts's ContentPlan* types in svet-ikony. */
export type WorkerContentPlanSlotStatus =
  | "SENT"
  | "READY"
  | "DRAFT"
  | "SOURCE_READY"
  | "MISSING_SOURCE"
  | "REVIEW_REQUIRED"
  | "FAILED";

export interface WorkerContentPlanDeliveryPreview {
  kind: "text_only" | "photo_with_caption" | "photo_then_text";
  photoCaption: string | null;
}

export interface WorkerContentPlanSlotDto {
  contentType: AutopostContentType;
  scheduledTime: string;
  sourceStatus: "available" | "missing_source" | "insufficient_data";
  verificationStatus: "verified" | "failed" | null;
  publicationStatus: WorkerContentPlanSlotStatus;
  textAvailable: boolean;
  imageAvailable: boolean;
  sentAt: string | null;
  telegramMessageId: number | null;
  errorMessage: string | null;
  textPreview?: string;
  imageUrl?: string;
  /** Detail-only, from buildContentPlanDayDetail() -- never present in the
   * bulk year/range list. */
  fullText?: string;
  deliveryPreview?: WorkerContentPlanDeliveryPreview;
}

export interface WorkerContentPlanDayDto {
  civilDate: string;
  julianDate: string;
  calendarTitle: string | null;
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
