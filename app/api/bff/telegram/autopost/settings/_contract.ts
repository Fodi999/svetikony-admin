/** Mirrors lib/d1/repositories/telegram-autopost.ts's AutopostSettingsDto in svet-ikony. */
export interface WorkerAutopostSettingDto {
  contentType: string;
  enabled: boolean;
  scheduleTime: string;
}

export interface WorkerAutopostSettingsDto {
  globalEnabled: boolean;
  items: WorkerAutopostSettingDto[];
}

export type BffAutopostSettingsDto = WorkerAutopostSettingsDto;

export function toBffAutopostSettingsDto(worker: WorkerAutopostSettingsDto): BffAutopostSettingsDto {
  return worker;
}

export interface WorkerAutopostSettingsWritePayload {
  globalEnabled?: boolean;
  items?: { contentType: string; enabled?: boolean; scheduleTime?: string }[];
}
