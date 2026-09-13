import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../../_lib/auth";
import { proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";

export const POST = withAuth(POLICY.contentEdit, async (request: Request) =>
  proxyJsonWrite(`${UPSTREAM_ENDPOINTS.calendarDays}/prepare-date`, "POST", await request.json(), (raw: unknown) => raw, 100_000),
);
