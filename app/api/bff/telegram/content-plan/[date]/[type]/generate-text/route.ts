import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../../../_lib/proxy";
import { toBffTelegramPostDto, type WorkerTelegramPostDto } from "../../../../posts/_contract";

/** Proxies the Content Plan "generate-text" slot action -- see
 * svet-ikony's app/api/admin/telegram/content-plan/[date]/[type]/generate-text/route.ts.
 * Reuses the same Worker/Bff TelegramPost DTO the Публікації tab already
 * uses, since the action returns the same underlying telegram_posts row. */
export async function POST(_request: Request, { params }: { params: Promise<{ date: string; type: string }> }) {
  const { date, type } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/${encodeURIComponent(type)}/generate-text`,
    "POST",
    undefined,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}
