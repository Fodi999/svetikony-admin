import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffIconAiFillResultDto, type WorkerIconAiFillResultDto } from "../../_contract";

/** "Заповнити відсутнє з AI" -- fills only missing description/history/
 * saint-image-description; never overwrites existing content; never
 * publishes. 120s: worst case chains up to 3 sequential OpenAI text calls
 * in a single request, over the 10s default. */
async function handlePost(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.icons}/${encodeURIComponent(id)}/fill-missing`,
    "POST",
    undefined,
    (raw: WorkerIconAiFillResultDto) => toBffIconAiFillResultDto(raw),
    120_000,
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
