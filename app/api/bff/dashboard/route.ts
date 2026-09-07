import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import { toBffDashboardStatsDto, type WorkerDashboardStatsDto } from "./_contract";

/**
 * Read-only aggregate — GET only, no writes of any kind (matches
 * svet-ikony's real /api/admin/dashboard exactly).
 *
 * Policy: POLICY.contentView, not a dedicated dashboard/orders policy —
 * a deliberate choice, not an assumption. The Dashboard nav entry has
 * always been area="content" (lib/constants/navigation.ts, unchanged by
 * this phase), and svet-ikony's DashboardStatsDto contains zero customer
 * PII by construction (verified directly — only aggregate counts and a
 * bounded id/title/date/status calendar-day list, see _contract.ts) even
 * though it includes order-derived counts (newOrders/unreadOrders). Since
 * a bare count is not PII, and changing who can even see the app's own
 * landing page would be a materially bigger, unrequested access change,
 * this keeps Dashboard visible to the same roles who already land on it
 * today (everyone with content access) rather than newly restricting it
 * to the same super_admin/order_manager set Orders itself now requires.
 */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.dashboard, undefined, (raw: WorkerDashboardStatsDto) => toBffDashboardStatsDto(raw));
}

export const GET = withAuth(POLICY.contentView, handleGet);
