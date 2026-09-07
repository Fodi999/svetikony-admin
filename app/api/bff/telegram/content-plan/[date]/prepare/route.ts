import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../../_lib/auth";
import { proxyJsonWrite } from "../../../../_lib/proxy";
import { POLICY } from "../../../../_lib/route-policies";
import { toBffPrepareDayReportDto, type WorkerPrepareDayReportDto } from "../../_contract";

/** Proxies "Підготувати весь день" -- see svet-ikony's
 * app/api/admin/telegram/content-plan/[date]/prepare/route.ts. Fills
 * missing text/images for the day's available slots; never sends Telegram,
 * never marks anything ready. */
async function handlePost(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/prepare`,
    "POST",
    undefined,
    (raw: WorkerPrepareDayReportDto) => toBffPrepareDayReportDto(raw),
  );
}

export const POST = withAuth(POLICY.telegramEdit, handlePost);
