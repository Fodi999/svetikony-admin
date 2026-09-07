import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffPrayerDto, type WorkerPrayerDto, type WorkerPrayerWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-prayer endpoint.
 * Returns a BffPrayerDto, not the raw Worker row. */
async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.prayers}/${encodeURIComponent(id)}`, undefined, (raw: WorkerPrayerDto) =>
    toBffPrayerDto(raw),
  );
}

async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerPrayerWritePayload;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.prayers}/${encodeURIComponent(id)}`, "PUT", payload, (raw: WorkerPrayerDto) =>
    toBffPrayerDto(raw),
  );
}

async function handleDelete(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.prayers}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const PUT = withAuth(POLICY.contentEdit, handlePut);
export const DELETE = withAuth(POLICY.contentEdit, handleDelete);
