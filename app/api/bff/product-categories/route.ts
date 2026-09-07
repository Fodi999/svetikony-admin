import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import {
  toBffProductCategoryDto,
  toBffProductCategoryDtoList,
  type WorkerProductCategoryDto,
  type WorkerProductCategoryWritePayload,
} from "./_contract";

/** Same-origin proxy for the verified svet-ikony product-categories list
 * endpoint. Returns BffProductCategoryDto[], not the raw Worker row. */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.categories, undefined, (raw: WorkerProductCategoryDto[]) =>
    toBffProductCategoryDtoList(raw),
  );
}

async function handlePost(request: NextRequest) {
  const payload = (await request.json()) as WorkerProductCategoryWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.categories, "POST", payload, (raw: WorkerProductCategoryDto) =>
    toBffProductCategoryDto(raw),
  );
}

export const GET = withAuth(POLICY.catalogView, handleGet);
export const POST = withAuth(POLICY.catalogEdit, handlePost);
