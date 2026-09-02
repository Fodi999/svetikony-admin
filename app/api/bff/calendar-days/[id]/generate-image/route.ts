import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { toBffCalendarDayDto, type WorkerCalendarDayDto } from "../../_contract";

/** 60s: a real OpenAI image generation call commonly takes 20-40s, well
 * over the 10s default (see proxy.ts's proxyJsonWrite doc comment -- this
 * was the actual cause of "Немає з'єднання з сервером" on this action). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/generate-image`,
    "POST",
    undefined,
    (raw: WorkerCalendarDayDto) => toBffCalendarDayDto(raw),
    60_000,
  );
}
