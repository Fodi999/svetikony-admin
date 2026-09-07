import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../../_lib/auth";
import { proxyAndMap } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffTelegramUserDto, type WorkerTelegramUserDto } from "./_contract";

/** Admin "Аудиторія" tab, read-only — no POST/PUT/DELETE proxy here. */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.users, undefined, (raw: WorkerTelegramUserDto[]) => raw.map(toBffTelegramUserDto));
}

export const GET = withAuth(POLICY.telegramView, handleGet);
