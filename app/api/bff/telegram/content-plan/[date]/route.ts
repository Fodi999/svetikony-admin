import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap } from "../../../_lib/proxy";
import { toBffContentPlanDayDto, type WorkerContentPlanDayDto } from "../_contract";

/** Read-only proxy for a single day's Content Plan detail (drawer). GET
 * only, fetched lazily by the admin UI only when a day is opened. */
export async function GET(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}`, undefined, (raw: WorkerContentPlanDayDto) =>
    toBffContentPlanDayDto(raw),
  );
}
