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
