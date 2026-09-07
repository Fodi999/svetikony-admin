import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffGospelDto, type WorkerGospelDto, type WorkerGospelWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-gospel-reading
 * endpoint. Returns a BffGospelDto, not the raw Worker row. */
async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.gospelReadings}/${encodeURIComponent(id)}`, undefined, (raw: WorkerGospelDto) =>
    toBffGospelDto(raw),
  );
}

async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerGospelWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.gospelReadings}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerGospelDto) => toBffGospelDto(raw),
  );
}

/** Real backend semantics: a hard DELETE (see svet-ikony's
 * lib/d1/repositories/gospel.ts's deleteGospel), not an archive — same as
 * Articles. The admin's `status: 'archived'` value already covers the
 * "keep the row, hide it" case via a normal status update through PUT. */
async function handleDelete(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.gospelReadings}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const PUT = withAuth(POLICY.contentEdit, handlePut);
export const DELETE = withAuth(POLICY.contentEdit, handleDelete);
