/** Mirrors app/api/admin/telegram/status/route.ts in svet-ikony exactly. */
export interface WorkerTelegramStatusDto {
  configured: boolean;
  channel: string | null;
  webhook: { url: string; pendingUpdateCount: number; lastErrorMessage: string | null } | null;
  stats: { userCount: number; chatCount: number; lastActivityAt: string | null };
}

export type BffTelegramStatusDto = WorkerTelegramStatusDto;

export function toBffTelegramStatusDto(worker: WorkerTelegramStatusDto): BffTelegramStatusDto {
  return worker;
}
