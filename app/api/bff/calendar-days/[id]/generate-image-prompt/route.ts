import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffCalendarAiWriteResultDto, type WorkerCalendarAiWriteResultDto } from "../../_contract";

/** "Промпт для AI" -- generates directly from an admin-authored English
 * prompt, bypassing the saint-reference resolver. 60s timeout, same as
 * generate-image: a real OpenAI image call commonly takes 20-40s. */
async function handlePost(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { prompt: string };
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/generate-image-prompt`,
    "POST",
    body,
    (raw: WorkerCalendarAiWriteResultDto) => toBffCalendarAiWriteResultDto(raw),
    60_000,
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
