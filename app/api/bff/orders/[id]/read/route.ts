import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";

/**
 * Mark-read only — matches svet-ikony's real
 * PUT /api/admin/church-content/icon-orders/[id]/read exactly, which
 * unconditionally sets is_read = 1 and has no body. There is deliberately
 * no mark-UNREAD route: the real backend has no such endpoint at all
 * (verified directly), so none is invented here either — see the Phase
 * 2B-5A report's IS_READ MODEL section.
 */
async function handlePut(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.orders}/${encodeURIComponent(id)}/read`, "PUT", undefined, () => undefined);
}

export const PUT = withAuth(POLICY.ordersEdit, handlePut);
