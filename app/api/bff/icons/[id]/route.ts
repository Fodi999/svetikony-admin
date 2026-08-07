import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { toBffIconDto, type WorkerIconDto, type WorkerIconWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-icon endpoint.
 * Returns a BffIconDto, not the raw Worker row. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.icons}/${encodeURIComponent(id)}`, undefined, (raw: WorkerIconDto) =>
    toBffIconDto(raw),
  );
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerIconWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.icons}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerIconDto) => toBffIconDto(raw),
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.icons}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}
