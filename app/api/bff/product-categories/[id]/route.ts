import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffProductCategoryDto, type WorkerProductCategoryDto, type WorkerProductCategoryWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-category endpoint.
 * Returns a BffProductCategoryDto, not the raw Worker row. */
async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.categories}/${encodeURIComponent(id)}`, undefined, (raw: WorkerProductCategoryDto) =>
    toBffProductCategoryDto(raw),
  );
}

async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerProductCategoryWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.categories}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerProductCategoryDto) => toBffProductCategoryDto(raw),
  );
}

async function handleDelete(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.categories}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}

export const GET = withAuth(POLICY.catalogView, handleGet);
export const PUT = withAuth(POLICY.catalogEdit, handlePut);
export const DELETE = withAuth(POLICY.catalogEdit, handleDelete);
