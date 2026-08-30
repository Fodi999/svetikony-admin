/** Mirrors lib/d1/repositories/telegram.ts's TelegramChatDto in svet-ikony. */
export interface WorkerTelegramChatDto {
  id: number;
  telegramChatId: number;
  chatType: string;
  title: string | null;
  username: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BffTelegramChatDto = WorkerTelegramChatDto;

export function toBffTelegramChatDto(worker: WorkerTelegramChatDto): BffTelegramChatDto {
  return worker;
}
