import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import { toBffOrderDtoList, type WorkerIconOrderDto } from "./_contract";

/** Same-origin proxy for the verified svet-ikony orders list endpoint.
 * GET only — deliberately no POST here: the real business flow is
 * public-create-only (app/api/church/icon-orders and
 * /product-orders in svet-ikony), the admin never creates an order (see
 * the Phase 2B-5A report's EXISTING BACKEND ROUTES section). The Worker's
 * list endpoint takes no query params server-side, so search/status
 * filtering happens client-side in lib/api/http/orders.ts, same as
 * Articles/Gospel/Saints. */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.orders, undefined, (raw: WorkerIconOrderDto[]) => toBffOrderDtoList(raw));
}

export const GET = withAuth(POLICY.ordersView, handleGet);
