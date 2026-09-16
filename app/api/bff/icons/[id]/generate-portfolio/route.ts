import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffGenerateIconPortfolioResultDto, type WorkerGenerateIconPortfolioResultDto } from "../../_contract";

/** 120s: three sequential OpenAI image-edit calls -- same timeout class as
 * calendar's image generation routes. */
async function handlePost(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.icons}/${encodeURIComponent(id)}/generate-portfolio`,
    "POST",
    undefined,
    (raw: WorkerGenerateIconPortfolioResultDto) => toBffGenerateIconPortfolioResultDto(raw),
    120_000,
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
