import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../../../_lib/proxy";
import { toBffTelegramPostDto, type WorkerTelegramPostDto } from "../../../../posts/_contract";

/** Proxies the Content Plan "text" slot action -- see
 * svet-ikony's app/api/admin/telegram/content-plan/[date]/[type]/text/route.ts. */
export async function PUT(request: Request, { params }: { params: Promise<{ date: string; type: string }> }) {
  const { date, type } = await params;
  const payload = await request.json();
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/${encodeURIComponent(type)}/text`,
    "PUT",
    payload,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}
