import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { toBffCalendarAiFillResultDto, type WorkerCalendarAiFillResultDto } from "../../_contract";

/** "Заповнити відсутнє з AI" -- fills only missing description/history/
 * SEO/image; never overwrites existing content; never publishes. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/fill-missing`,
    "POST",
    undefined,
    (raw: WorkerCalendarAiFillResultDto) => toBffCalendarAiFillResultDto(raw),
  );
}
