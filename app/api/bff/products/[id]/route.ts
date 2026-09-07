import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffProductDto, type WorkerProductDto, type WorkerProductWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-product endpoint.
 * Returns a BffProductDto, not the raw Worker row. */
async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.products}/${encodeURIComponent(id)}`, undefined, (raw: WorkerProductDto) =>
    toBffProductDto(raw),
  );
}

async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerProductWritePayload;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.products}/${encodeURIComponent(id)}`, "PUT", payload, (raw: WorkerProductDto) =>
    toBffProductDto(raw),
  );
}

async function handleDelete(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.products}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}

export const GET = withAuth(POLICY.catalogView, handleGet);
export const PUT = withAuth(POLICY.catalogEdit, handlePut);
export const DELETE = withAuth(POLICY.catalogEdit, handleDelete);
