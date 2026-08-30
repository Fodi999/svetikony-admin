import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap } from "../../_lib/proxy";
import { toBffTelegramUserDto, type WorkerTelegramUserDto } from "./_contract";

/** Admin "Аудиторія" tab, read-only — no POST/PUT/DELETE proxy here. */
export async function GET() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.users, undefined, (raw: WorkerTelegramUserDto[]) => raw.map(toBffTelegramUserDto));
}
