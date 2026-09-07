import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../../../_lib/auth";
import { proxyJsonWrite } from "../../../../../_lib/proxy";
import { POLICY } from "../../../../../_lib/route-policies";
import { toBffTelegramPostDto, type WorkerTelegramPostDto } from "../../../../posts/_contract";

/** Proxies the Content Plan "regenerate-text" slot action -- see
 * svet-ikony's app/api/admin/telegram/content-plan/[date]/[type]/regenerate-text/route.ts.
 * Reuses the same Worker/Bff TelegramPost DTO the Публікації tab already
 * uses, since the action returns the same underlying telegram_posts row. */
async function handlePost(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ date: string; type: string }> }) {
  const { date, type } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/${encodeURIComponent(type)}/regenerate-text`,
    "POST",
    undefined,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}

export const POST = withAuth(POLICY.telegramEdit, handlePost);
