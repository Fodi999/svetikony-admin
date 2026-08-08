import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { toBffSaintDto, toBffSaintDtoList, type WorkerSaintDto, type WorkerSaintWritePayload } from "./_contract";

/** Same-origin proxy for the verified svet-ikony saints list endpoint.
 * Returns BffSaintDto[], not the raw Worker row. The Worker's admin list
 * route supports `calendarDayId`/`iconId`/`language` filters server-side,
 * but none are used by the admin UI yet — matches the Alphabet/Prayers
 * precedent of letting the shared factory filter client-side. */
export async function GET(_request: NextRequest) {
  return proxyAndMap(UPSTREAM_ENDPOINTS.saints, undefined, (raw: WorkerSaintDto[]) => toBffSaintDtoList(raw));
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as WorkerSaintWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.saints, "POST", payload, (raw: WorkerSaintDto) => toBffSaintDto(raw));
}
