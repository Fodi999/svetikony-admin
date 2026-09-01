/** Mirrors lib/d1/repositories/telegram.ts's TelegramPostDto in svet-ikony.
 * `telegramChatId` is dropped — it's the resolved-channel row id, an
 * internal detail the admin never needs (this stage only ever publishes to
 * the one channel; there's nothing for the UI to pick). */
export interface WorkerTelegramPostDto {
  id: number;
  telegramChatId: number | null;
  sourceType: string | null;
  sourceId: string | null;
  text: string | null;
  mediaUrl: string | null;
  telegramMessageId: number | null;
  status: "draft" | "scheduled" | "sent" | "failed";
  scheduledAt: string | null;
  sentAt: string | null;
  errorMessage: string | null;
  /** Set only for autopost-generated rows (svet-ikony migration 0008) —
   * null for manually-composed posts. */
  contentType: string | null;
  publishDate: string | null;
  /** Pre-publish calendar verification outcome (svet-ikony migration 0010)
   * -- 'verified' | 'failed' | null. Only ever set for content types that
   * require it (saint_of_day); null for every other type and for rows
   * predating the feature -- never treat null as "verified". */
  verificationStatus: string | null;
  verificationError: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BffTelegramPostDto = Omit<WorkerTelegramPostDto, "telegramChatId">;

export function toBffTelegramPostDto(worker: WorkerTelegramPostDto): BffTelegramPostDto {
  return {
    id: worker.id,
    sourceType: worker.sourceType,
    sourceId: worker.sourceId,
    text: worker.text,
    mediaUrl: worker.mediaUrl,
    telegramMessageId: worker.telegramMessageId,
    status: worker.status,
    scheduledAt: worker.scheduledAt,
    sentAt: worker.sentAt,
    errorMessage: worker.errorMessage,
    contentType: worker.contentType,
    publishDate: worker.publishDate,
    verificationStatus: worker.verificationStatus,
    verificationError: worker.verificationError,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export interface WorkerTelegramPostWritePayload {
  text?: string | null;
  mediaUrl?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  scheduledAt?: string | null;
}
