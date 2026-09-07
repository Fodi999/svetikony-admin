import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import { toBffIconDto, toBffIconDtoList, type WorkerIconDto, type WorkerIconWritePayload } from "./_contract";

/** Same-origin proxy for the verified svet-ikony icons list endpoint.
 * Returns BffIconDto[], not the raw Worker row. The Worker's admin list
 * route supports a `language`/`calendarDayId` filter server-side, but
 * neither is used by the admin UI yet — matches the Alphabet/Prayers
 * precedent of letting the shared factory filter client-side. */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.icons, undefined, (raw: WorkerIconDto[]) => toBffIconDtoList(raw));
}

async function handlePost(request: NextRequest) {
  const payload = (await request.json()) as WorkerIconWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.icons, "POST", payload, (raw: WorkerIconDto) => toBffIconDto(raw));
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const POST = withAuth(POLICY.contentEdit, handlePost);
