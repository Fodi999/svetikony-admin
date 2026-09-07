import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffCalendarDayDto, type WorkerCalendarDayDto } from "../../_contract";

/** 30s: a real OpenAI text completion can take longer than the 10s default
 * (see proxy.ts's proxyJsonWrite doc comment). */
async function handlePost(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/generate-history`,
    "POST",
    undefined,
    (raw: WorkerCalendarDayDto) => toBffCalendarDayDto(raw),
    30_000,
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
