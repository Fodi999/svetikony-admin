import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyAndMap } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffContentPlanDayDto, type WorkerContentPlanDayDto } from "../_contract";

/** Read-only proxy for a single day's Content Plan detail (drawer). GET
 * only, fetched lazily by the admin UI only when a day is opened. */
async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}`, undefined, (raw: WorkerContentPlanDayDto) =>
    toBffContentPlanDayDto(raw),
  );
}

export const GET = withAuth(POLICY.telegramView, handleGet);
