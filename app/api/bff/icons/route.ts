import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { toBffIconDto, toBffIconDtoList, type WorkerIconDto, type WorkerIconWritePayload } from "./_contract";

/** Same-origin proxy for the verified svet-ikony icons list endpoint.
 * Returns BffIconDto[], not the raw Worker row. The Worker's admin list
 * route supports a `language`/`calendarDayId` filter server-side, but
 * neither is used by the admin UI yet — matches the Alphabet/Prayers
 * precedent of letting the shared factory filter client-side. */
export async function GET(_request: NextRequest) {
  return proxyAndMap(UPSTREAM_ENDPOINTS.icons, undefined, (raw: WorkerIconDto[]) => toBffIconDtoList(raw));
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as WorkerIconWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.icons, "POST", payload, (raw: WorkerIconDto) => toBffIconDto(raw));
}
