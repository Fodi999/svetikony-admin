import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import {
  toBffProductCategoryDto,
  toBffProductCategoryDtoList,
  type WorkerProductCategoryDto,
  type WorkerProductCategoryWritePayload,
} from "./_contract";

/** Same-origin proxy for the verified svet-ikony product-categories list
 * endpoint. Returns BffProductCategoryDto[], not the raw Worker row. */
export async function GET(_request: NextRequest) {
  return proxyAndMap(UPSTREAM_ENDPOINTS.categories, undefined, (raw: WorkerProductCategoryDto[]) =>
    toBffProductCategoryDtoList(raw),
  );
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as WorkerProductCategoryWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.categories, "POST", payload, (raw: WorkerProductCategoryDto) =>
    toBffProductCategoryDto(raw),
  );
}
