import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { toBffPrayerDto, toBffPrayerDtoList, type WorkerPrayerDto, type WorkerPrayerWritePayload } from "./_contract";

/** Same-origin proxy for the verified svet-ikony prayers list endpoint.
 * Returns BffPrayerDto[], not the raw Worker row. */
export async function GET(request: NextRequest) {
  const forwarded = new URLSearchParams();
  const language = request.nextUrl.searchParams.get("language");
  if (language) forwarded.set("language", language);
  return proxyAndMap(UPSTREAM_ENDPOINTS.prayers, forwarded, (raw: WorkerPrayerDto[]) => toBffPrayerDtoList(raw));
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as WorkerPrayerWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.prayers, "POST", payload, (raw: WorkerPrayerDto) => toBffPrayerDto(raw));
}
