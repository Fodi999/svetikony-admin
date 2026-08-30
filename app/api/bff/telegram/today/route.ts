import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap } from "../../_lib/proxy";
import { toBffTelegramTodayDto, type WorkerTelegramTodayDto } from "./_contract";

export async function GET() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.today, undefined, (raw: WorkerTelegramTodayDto) => toBffTelegramTodayDto(raw));
}
