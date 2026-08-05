import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { toBffProductCategoryDto, type WorkerProductCategoryDto, type WorkerProductCategoryWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-category endpoint.
 * Returns a BffProductCategoryDto, not the raw Worker row. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.categories}/${encodeURIComponent(id)}`, undefined, (raw: WorkerProductCategoryDto) =>
    toBffProductCategoryDto(raw),
  );
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerProductCategoryWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.categories}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerProductCategoryDto) => toBffProductCategoryDto(raw),
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.categories}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}
