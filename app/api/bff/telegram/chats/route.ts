import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../../_lib/auth";
import { proxyAndMap } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffTelegramChatDto, type WorkerTelegramChatDto } from "./_contract";

/** Admin "Аудиторія" tab, read-only — no POST/PUT/DELETE proxy here. */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.chats, undefined, (raw: WorkerTelegramChatDto[]) => raw.map(toBffTelegramChatDto));
}

export const GET = withAuth(POLICY.telegramView, handleGet);
