import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { toBffProductDto, toBffProductDtoList, type WorkerProductDto, type WorkerProductWritePayload } from "./_contract";

/** Same-origin proxy for the verified svet-ikony products list endpoint.
 * Returns BffProductDto[], not the raw Worker row. The Worker's admin list
 * route has no server-side query params (same as Prayers) — categoryId/
 * active/featured filtering happens client-side, see lib/api/http/products.ts. */
export async function GET(_request: NextRequest) {
  return proxyAndMap(UPSTREAM_ENDPOINTS.products, undefined, (raw: WorkerProductDto[]) => toBffProductDtoList(raw));
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as WorkerProductWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.products, "POST", payload, (raw: WorkerProductDto) => toBffProductDto(raw));
}
