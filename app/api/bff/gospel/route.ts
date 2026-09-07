import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import { toBffGospelDto, toBffGospelDtoList, type WorkerGospelDto, type WorkerGospelWritePayload } from "./_contract";

/** Same-origin proxy for the verified svet-ikony gospel list endpoint.
 * Returns BffGospelDto[], not the raw Worker row. The Worker's admin list
 * route supports `calendarDayId`/`iconId`/`language` filters server-side,
 * but none are used by the admin UI yet — matches the Articles/Saints
 * precedent of letting the shared factory filter client-side. */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.gospelReadings, undefined, (raw: WorkerGospelDto[]) => toBffGospelDtoList(raw));
}

async function handlePost(request: NextRequest) {
  const payload = (await request.json()) as WorkerGospelWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.gospelReadings, "POST", payload, (raw: WorkerGospelDto) => toBffGospelDto(raw));
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const POST = withAuth(POLICY.contentEdit, handlePost);
