import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import {
  toBffVisualizerModelDto,
  type WorkerVisualizerModelDto,
  type WorkerVisualizerModelWritePayload,
} from "../_contract";

async function handleGet(_request: NextRequest, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.visualizerModels}/${encodeURIComponent(id)}`, undefined, (raw: WorkerVisualizerModelDto) =>
    toBffVisualizerModelDto(raw),
  );
}

async function handlePut(request: NextRequest, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerVisualizerModelWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.visualizerModels}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerVisualizerModelDto) => toBffVisualizerModelDto(raw),
  );
}

/** `?force=1` is forwarded upstream unchanged -- svet-ikony's own DELETE
 * route refuses to remove the active Base Earth Model without it (see
 * app/api/admin/church-content/visualizer-models/[id]/route.ts). */
async function handleDelete(request: NextRequest, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const force = request.nextUrl.searchParams.get("force");
  const suffix = force ? `?force=${encodeURIComponent(force)}` : "";
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.visualizerModels}/${encodeURIComponent(id)}${suffix}`, "DELETE", undefined, () => undefined);
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const PUT = withAuth(POLICY.contentEdit, handlePut);
export const DELETE = withAuth(POLICY.contentEdit, handleDelete);
