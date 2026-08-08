import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { toBffSaintDto, type WorkerSaintDto, type WorkerSaintWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-saint endpoint.
 * Returns a BffSaintDto, not the raw Worker row. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.saints}/${encodeURIComponent(id)}`, undefined, (raw: WorkerSaintDto) =>
    toBffSaintDto(raw),
  );
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerSaintWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.saints}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerSaintDto) => toBffSaintDto(raw),
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.saints}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}
