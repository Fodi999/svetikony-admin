import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap } from "../../_lib/proxy";
import { toBffTelegramStatusDto, type WorkerTelegramStatusDto } from "./_contract";

export async function GET() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.status, undefined, (raw: WorkerTelegramStatusDto) => toBffTelegramStatusDto(raw));
}
