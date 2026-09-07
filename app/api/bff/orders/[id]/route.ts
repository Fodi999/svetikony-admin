import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffOrderDto, type WorkerIconOrderDto, type WorkerOrderWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-order endpoint.
 * Returns a BffOrderDto, not the raw Worker row (customer PII whitelist
 * applied — see _contract.ts). No DELETE: admin never deletes an order
 * (matches the real backend, which has no delete route either). */
async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.orders}/${encodeURIComponent(id)}`, undefined, (raw: WorkerIconOrderDto) =>
    toBffOrderDto(raw),
  );
}

/**
 * Deliberately partial: the caller (lib/api/http/orders.ts) always sends
 * exactly one of `{status}` / `{adminNote}`, never both — matching
 * svet-ikony's real updateIconOrder(), which merges correctly against
 * the current row for whichever field is omitted (verified directly, not
 * assumed — see the Phase 2B-5A report's UPDATE SEMANTICS section). This
 * route itself does no extra validation beyond forwarding the payload —
 * the Worker is the authoritative validator (status must be one of the
 * real 8 values, checked there).
 */
async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerOrderWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.orders}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerIconOrderDto) => toBffOrderDto(raw),
  );
}

export const GET = withAuth(POLICY.ordersView, handleGet);
export const PUT = withAuth(POLICY.ordersEdit, handlePut);
