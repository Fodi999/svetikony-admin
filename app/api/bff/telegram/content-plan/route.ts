import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap } from "../../_lib/proxy";
import { toBffContentPlanReportDto, type WorkerContentPlanReportDto } from "./_contract";

/** Read-only proxy for the Content Plan year/range calendar. GET only —
 * this feature never writes anything upstream. */
export async function GET(request: NextRequest) {
  const forwarded = new URLSearchParams();
  const year = request.nextUrl.searchParams.get("year");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (year) forwarded.set("year", year);
  if (from) forwarded.set("from", from);
  if (to) forwarded.set("to", to);

  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.contentPlan, forwarded, (raw: WorkerContentPlanReportDto) =>
    toBffContentPlanReportDto(raw),
  );
}
