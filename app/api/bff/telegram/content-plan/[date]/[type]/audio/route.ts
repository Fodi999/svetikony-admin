import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../../../_lib/proxy";
import { toBffTelegramPostDto, type WorkerTelegramPostDto } from "../../../../posts/_contract";

/** Proxies the Content Plan "audio" slot actions -- see
 * svet-ikony's app/api/admin/telegram/content-plan/[date]/[type]/audio/route.ts. */
export async function PUT(request: Request, { params }: { params: Promise<{ date: string; type: string }> }) {
  const { date, type } = await params;
  const payload = await request.json();
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/${encodeURIComponent(type)}/audio`,
    "PUT",
    payload,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ date: string; type: string }> }) {
  const { date, type } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/${encodeURIComponent(type)}/audio`,
    "DELETE",
    undefined,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}
