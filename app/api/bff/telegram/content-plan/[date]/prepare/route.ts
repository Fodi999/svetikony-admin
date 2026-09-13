import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../../_lib/auth";
import { proxyJsonWrite } from "../../../../_lib/proxy";
import { POLICY } from "../../../../_lib/route-policies";
import { toBffPrepareDayReportDto, type WorkerPrepareDayReportDto } from "../../_contract";

/** Proxies "Підготувати весь день" -- see svet-ikony's
 * app/api/admin/telegram/content-plan/[date]/prepare/route.ts. Fills
 * missing text/images for the day's available slots; never sends Telegram,
 * never marks anything ready. */
async function handlePost(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const text = await request.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : undefined; } catch {
    return Response.json({ code: "VALIDATION_ERROR", message: "Invalid JSON" }, { status: 400 });
  }
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/prepare`,
    "POST",
    body,
    (raw: WorkerPrepareDayReportDto) => toBffPrepareDayReportDto(raw),
    180_000,
  );
}

export const POST = withAuth(POLICY.telegramEdit, handlePost);
