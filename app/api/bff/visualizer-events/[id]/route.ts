import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import {
  toBffVisualizerEventDto,
  type WorkerVisualizerEventDto,
  type WorkerVisualizerEventWritePayload,
} from "../_contract";

async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.visualizerEvents}/${encodeURIComponent(id)}`, undefined, (raw: WorkerVisualizerEventDto) =>
    toBffVisualizerEventDto(raw),
  );
}

async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerVisualizerEventWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.visualizerEvents}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerVisualizerEventDto) => toBffVisualizerEventDto(raw),
  );
}

async function handleDelete(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.visualizerEvents}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const PUT = withAuth(POLICY.contentEdit, handlePut);
export const DELETE = withAuth(POLICY.contentEdit, handleDelete);
