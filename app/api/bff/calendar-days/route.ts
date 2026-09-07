import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import {
  toBffCalendarDayDto,
  toBffCalendarDayDtoList,
  type WorkerCalendarDayDto,
  type WorkerCalendarDayWritePayload,
} from "./_contract";

/** Same-origin proxy for the verified svet-ikony calendar-days list
 * endpoint. Safe to call from client-side code. Returns
 * BffCalendarDayDto[], not the raw Worker row. */
async function handleGet(request: NextRequest) {
  const forwarded = new URLSearchParams();
  const year = request.nextUrl.searchParams.get("year");
  const month = request.nextUrl.searchParams.get("month");
  if (year) forwarded.set("year", year);
  if (month) forwarded.set("month", month);
  return proxyAndMap(UPSTREAM_ENDPOINTS.calendarDays, forwarded, (raw: WorkerCalendarDayDto[]) =>
    toBffCalendarDayDtoList(raw),
  );
}

async function handlePost(request: NextRequest) {
  const payload = (await request.json()) as WorkerCalendarDayWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.calendarDays, "POST", payload, (raw: WorkerCalendarDayDto) =>
    toBffCalendarDayDto(raw),
  );
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const POST = withAuth(POLICY.contentEdit, handlePost);
