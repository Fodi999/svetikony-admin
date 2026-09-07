import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../../../_lib/auth";
import { proxyJsonWrite } from "../../../../../_lib/proxy";
import { POLICY } from "../../../../../_lib/route-policies";
import { toBffTelegramPostDto, type WorkerTelegramPostDto } from "../../../../posts/_contract";

/** Proxies the Content Plan "audio" slot actions -- see
 * svet-ikony's app/api/admin/telegram/content-plan/[date]/[type]/audio/route.ts. */
async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ date: string; type: string }> }) {
  const { date, type } = await params;
  const payload = await request.json();
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/${encodeURIComponent(type)}/audio`,
    "PUT",
    payload,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}

async function handleDelete(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ date: string; type: string }> }) {
  const { date, type } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/${encodeURIComponent(type)}/audio`,
    "DELETE",
    undefined,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}

export const PUT = withAuth(POLICY.telegramEdit, handlePut);
export const DELETE = withAuth(POLICY.telegramEdit, handleDelete);
