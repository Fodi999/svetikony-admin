import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { toBffProductDto, type WorkerProductDto, type WorkerProductWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-product endpoint.
 * Returns a BffProductDto, not the raw Worker row. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.products}/${encodeURIComponent(id)}`, undefined, (raw: WorkerProductDto) =>
    toBffProductDto(raw),
  );
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerProductWritePayload;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.products}/${encodeURIComponent(id)}`, "PUT", payload, (raw: WorkerProductDto) =>
    toBffProductDto(raw),
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.products}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}
