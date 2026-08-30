/** Mirrors lib/d1/repositories/telegram.ts's TelegramUserDto in svet-ikony. */
export interface WorkerTelegramUserDto {
  id: number;
  telegramUserId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isBot: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BffTelegramUserDto = WorkerTelegramUserDto;

export function toBffTelegramUserDto(worker: WorkerTelegramUserDto): BffTelegramUserDto {
  return worker;
}
