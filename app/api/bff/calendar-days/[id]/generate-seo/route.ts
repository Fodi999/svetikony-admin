import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { toBffCalendarDayDto, type WorkerCalendarDayDto } from "../../_contract";

/** 30s: this can chain up to two sequential OpenAI text completions (title
 * + description), longer than the 10s default (see proxy.ts's
 * proxyJsonWrite doc comment). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/generate-seo`,
    "POST",
    undefined,
    (raw: WorkerCalendarDayDto) => toBffCalendarDayDto(raw),
    30_000,
  );
}
