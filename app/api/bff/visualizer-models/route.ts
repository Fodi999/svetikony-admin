import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import {
  toBffVisualizerModelDto,
  toBffVisualizerModelDtoList,
  type WorkerVisualizerModelDto,
  type WorkerVisualizerModelWritePayload,
} from "./_contract";

async function handleGet(request: NextRequest) {
  const forwarded = new URLSearchParams();
  const eventGroupId = request.nextUrl.searchParams.get("eventGroupId");
  if (eventGroupId) forwarded.set("eventGroupId", eventGroupId);
  return proxyAndMap(UPSTREAM_ENDPOINTS.visualizerModels, forwarded, (raw: WorkerVisualizerModelDto[]) =>
    toBffVisualizerModelDtoList(raw),
  );
}

async function handlePost(request: NextRequest) {
  const payload = (await request.json()) as WorkerVisualizerModelWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.visualizerModels, "POST", payload, (raw: WorkerVisualizerModelDto) =>
    toBffVisualizerModelDto(raw),
  );
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const POST = withAuth(POLICY.contentEdit, handlePost);
