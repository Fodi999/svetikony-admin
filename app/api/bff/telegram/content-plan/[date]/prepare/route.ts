import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../../_lib/proxy";
import { toBffPrepareDayReportDto, type WorkerPrepareDayReportDto } from "../../_contract";

/** Proxies "Підготувати весь день" -- see svet-ikony's
 * app/api/admin/telegram/content-plan/[date]/prepare/route.ts. Fills
 * missing text/images for the day's available slots; never sends Telegram,
 * never marks anything ready. */
export async function POST(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/prepare`,
    "POST",
    undefined,
    (raw: WorkerPrepareDayReportDto) => toBffPrepareDayReportDto(raw),
  );
}
