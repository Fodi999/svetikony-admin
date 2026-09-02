import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { toBffCalendarAiFillResultDto, type WorkerCalendarAiFillResultDto } from "../../_contract";

/** "Заповнити відсутнє з AI" -- fills only missing description/history/
 * SEO/image; never overwrites existing content; never publishes.
 * 120s: worst case this chains up to 4 sequential OpenAI text calls plus
 * one image generation call in a single request, far over the 10s default
 * (see proxy.ts's proxyJsonWrite doc comment). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/fill-missing`,
    "POST",
    undefined,
    (raw: WorkerCalendarAiFillResultDto) => toBffCalendarAiFillResultDto(raw),
    120_000,
  );
}
