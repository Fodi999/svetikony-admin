import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import {
  toBffVisualizerEventDto,
  toBffVisualizerEventDtoList,
  type WorkerVisualizerEventDto,
  type WorkerVisualizerEventWritePayload,
} from "./_contract";

/** Same-origin proxy for the verified svet-ikony visualizer-events list
 * endpoint. Returns BffVisualizerEventDto[], not the raw Worker row. */
async function handleGet(request: NextRequest) {
  const forwarded = new URLSearchParams();
  const language = request.nextUrl.searchParams.get("language");
  const status = request.nextUrl.searchParams.get("status");
  if (language) forwarded.set("language", language);
  if (status) forwarded.set("status", status);
  return proxyAndMap(UPSTREAM_ENDPOINTS.visualizerEvents, forwarded, (raw: WorkerVisualizerEventDto[]) =>
    toBffVisualizerEventDtoList(raw),
  );
}

async function handlePost(request: NextRequest) {
  const payload = (await request.json()) as WorkerVisualizerEventWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.visualizerEvents, "POST", payload, (raw: WorkerVisualizerEventDto) =>
    toBffVisualizerEventDto(raw),
  );
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const POST = withAuth(POLICY.contentEdit, handlePost);
