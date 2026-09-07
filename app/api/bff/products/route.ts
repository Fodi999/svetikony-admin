import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import { toBffProductDto, toBffProductDtoList, type WorkerProductDto, type WorkerProductWritePayload } from "./_contract";

/** Same-origin proxy for the verified svet-ikony products list endpoint.
 * Returns BffProductDto[], not the raw Worker row. The Worker's admin list
 * route has no server-side query params (same as Prayers) — categoryId/
 * active/featured filtering happens client-side, see lib/api/http/products.ts. */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.products, undefined, (raw: WorkerProductDto[]) => toBffProductDtoList(raw));
}

async function handlePost(request: NextRequest) {
  const payload = (await request.json()) as WorkerProductWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.products, "POST", payload, (raw: WorkerProductDto) => toBffProductDto(raw));
}

export const GET = withAuth(POLICY.catalogView, handleGet);
export const POST = withAuth(POLICY.catalogEdit, handlePost);
