import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../../_lib/auth";
import { proxyAndMap } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffTelegramStatusDto, type WorkerTelegramStatusDto } from "./_contract";

async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.status, undefined, (raw: WorkerTelegramStatusDto) => toBffTelegramStatusDto(raw));
}

export const GET = withAuth(POLICY.telegramView, handleGet);
