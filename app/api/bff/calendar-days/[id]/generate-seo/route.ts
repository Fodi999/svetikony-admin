import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffCalendarAiWriteResultDto, type WorkerCalendarAiWriteResultDto } from "../../_contract";

/** 30s: this can chain up to two sequential OpenAI text completions (title
 * + description), longer than the 10s default (see proxy.ts's
 * proxyJsonWrite doc comment). */
async function handlePost(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/generate-seo`,
    "POST",
    undefined,
    (raw: WorkerCalendarAiWriteResultDto) => toBffCalendarAiWriteResultDto(raw),
    30_000,
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
