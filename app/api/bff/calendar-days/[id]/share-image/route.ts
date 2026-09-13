import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
export const POST = withAuth(POLICY.contentEdit, async (request: Request, _session, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/share-image`, "POST", await request.json(), (raw: unknown) => raw);
});
