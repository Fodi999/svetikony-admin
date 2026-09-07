import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import { toBffArticleDto, toBffArticleDtoList, type WorkerArticleDto, type WorkerArticleWritePayload } from "./_contract";

/** Same-origin proxy for the verified svet-ikony articles list endpoint.
 * Returns BffArticleDto[], not the raw Worker row. The Worker's admin list
 * route supports `calendarDayId`/`iconId`/`language` filters server-side,
 * but none are used by the admin UI yet — matches the Saints/Prayers
 * precedent of letting the shared factory filter client-side. */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.articles, undefined, (raw: WorkerArticleDto[]) => toBffArticleDtoList(raw));
}

async function handlePost(request: NextRequest) {
  const payload = (await request.json()) as WorkerArticleWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.articles, "POST", payload, (raw: WorkerArticleDto) => toBffArticleDto(raw));
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const POST = withAuth(POLICY.contentEdit, handlePost);
