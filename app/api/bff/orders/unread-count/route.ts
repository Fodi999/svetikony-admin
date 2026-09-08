import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../../_lib/auth";
import { proxyAndMap } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";

/**
 * GET /api/bff/orders/unread-count — powers the sidebar's unread-order
 * badge (features/orders/use-unread-orders.ts). Proxies svet-ikony's
 * existing GET /api/admin/church-content/icon-orders/unread-count
 * unchanged — no new backend endpoint was needed. Read-only, so
 * POLICY.ordersView (not ordersEdit): the same super_admin/order_manager
 * gate every other Orders route already uses (Phase 2B-5B tightened this
 * area to those two roles specifically because orders carry customer PII
 * — a bare count is not PII, but there's no reason to widen access here
 * either). No separate _contract.ts file: the upstream shape is already
 * exactly `{count: number}`, nothing to whitelist away.
 */
async function handleGet() {
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.orders}/unread-count`, undefined, (raw: { count: number }) => ({ count: raw.count }));
}

export const GET = withAuth(POLICY.ordersView, handleGet);
