import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../../_lib/auth";
import { proxyAndMap } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffTelegramTodayDto, type WorkerTelegramTodayDto } from "./_contract";

async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.today, undefined, (raw: WorkerTelegramTodayDto) => toBffTelegramTodayDto(raw));
}

export const GET = withAuth(POLICY.telegramView, handleGet);
