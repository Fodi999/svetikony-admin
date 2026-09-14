import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";

/** 30s: one OpenAI completion, same shape as generate-description --
 * longer than the 10s default (see proxy.ts's proxyJsonWrite doc
 * comment). Read-only on the calendar day itself: this only returns a
 * recommended prayer id, it never writes anything -- linking still goes
 * through the existing prayers update call. */
async function handlePost(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/recommend-prayer`,
    "POST",
    undefined,
    (raw: { prayerId: string | null }) => raw,
    30_000,
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
