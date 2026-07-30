import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import {
  toBffCalendarDayDto,
  toBffCalendarDayDtoList,
  type WorkerCalendarDayDto,
  type WorkerCalendarDayWritePayload,
} from "./_contract";

/** Same-origin proxy for the verified svet-ikony calendar-days list
 * endpoint. Safe to call from client-side code. Returns
 * BffCalendarDayDto[], not the raw Worker row. */
export async function GET(request: NextRequest) {
  const forwarded = new URLSearchParams();
  const year = request.nextUrl.searchParams.get("year");
  const month = request.nextUrl.searchParams.get("month");
  if (year) forwarded.set("year", year);
  if (month) forwarded.set("month", month);
  return proxyAndMap(UPSTREAM_ENDPOINTS.calendarDays, forwarded, (raw: WorkerCalendarDayDto[]) =>
    toBffCalendarDayDtoList(raw),
  );
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as WorkerCalendarDayWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.calendarDays, "POST", payload, (raw: WorkerCalendarDayDto) =>
    toBffCalendarDayDto(raw),
  );
}
