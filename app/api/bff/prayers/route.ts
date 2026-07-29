import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap } from "../_lib/proxy";
import { toBffPrayerDtoList, type WorkerPrayerDto } from "./_contract";

/** Same-origin proxy for the verified svet-ikony prayers list endpoint.
 * Returns BffPrayerDto[], not the raw Worker row. */
export async function GET(request: NextRequest) {
  const forwarded = new URLSearchParams();
  const language = request.nextUrl.searchParams.get("language");
  if (language) forwarded.set("language", language);
  return proxyAndMap(UPSTREAM_ENDPOINTS.prayers, forwarded, (raw: WorkerPrayerDto[]) => toBffPrayerDtoList(raw));
}
