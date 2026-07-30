import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { toBffCalendarDayDto, type WorkerCalendarDayDto, type WorkerCalendarDayWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-calendar-day
 * endpoint. Returns a BffCalendarDayDto, not the raw Worker row. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}`, undefined, (raw: WorkerCalendarDayDto) =>
    toBffCalendarDayDto(raw),
  );
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerCalendarDayWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerCalendarDayDto) => toBffCalendarDayDto(raw),
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}
