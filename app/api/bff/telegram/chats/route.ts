import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap } from "../../_lib/proxy";
import { toBffTelegramChatDto, type WorkerTelegramChatDto } from "./_contract";

/** Admin "Аудиторія" tab, read-only — no POST/PUT/DELETE proxy here. */
export async function GET() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.chats, undefined, (raw: WorkerTelegramChatDto[]) => raw.map(toBffTelegramChatDto));
}
