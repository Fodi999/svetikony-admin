import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { toBffPrayerDto, type WorkerPrayerDto, type WorkerPrayerWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-prayer endpoint.
 * Returns a BffPrayerDto, not the raw Worker row. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.prayers}/${encodeURIComponent(id)}`, undefined, (raw: WorkerPrayerDto) =>
    toBffPrayerDto(raw),
  );
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerPrayerWritePayload;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.prayers}/${encodeURIComponent(id)}`, "PUT", payload, (raw: WorkerPrayerDto) =>
    toBffPrayerDto(raw),
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.prayers}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}
