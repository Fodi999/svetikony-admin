import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { toBffCalendarDayDto, type WorkerCalendarDayDto } from "../../_contract";

/** "Обрати з медіатеки" -- assigns an already-uploaded R2 key/URL directly. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { imageUrl: string };
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/image`,
    "PUT",
    body,
    (raw: WorkerCalendarDayDto) => toBffCalendarDayDto(raw),
  );
}
