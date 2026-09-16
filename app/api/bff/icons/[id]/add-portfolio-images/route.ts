import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffIconAiWriteResultDto, type BffGeneratedPortfolioPhotoDto, type WorkerIconAiWriteResultDto } from "../../_contract";

/** Admin confirm step: forwards the admin-selected subset of a previous
 * generate-portfolio response back to the Worker unchanged -- the Worker's
 * addIconPortfolioImages() is the one place that re-validates every entry
 * against this icon's own portfolio namespace before it can enter the
 * gallery. */
async function handlePost(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { images: BffGeneratedPortfolioPhotoDto[] };
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.icons}/${encodeURIComponent(id)}/add-portfolio-images`,
    "POST",
    body,
    (raw: WorkerIconAiWriteResultDto) => toBffIconAiWriteResultDto(raw),
    30_000,
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
