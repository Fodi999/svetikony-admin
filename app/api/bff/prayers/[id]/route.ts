import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap } from "../../_lib/proxy";
import { toBffPrayerDto, type WorkerPrayerDto } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-prayer endpoint.
 * Returns a BffPrayerDto, not the raw Worker row. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.prayers}/${encodeURIComponent(id)}`, undefined, (raw: WorkerPrayerDto) =>
    toBffPrayerDto(raw),
  );
}
