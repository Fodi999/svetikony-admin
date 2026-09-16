import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffProductAiWriteResultDto, type WorkerProductAiWriteResultDto } from "../../_contract";

async function handlePost(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { language: string };
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.products}/${encodeURIComponent(id)}/generate-seo-title`,
    "POST",
    body,
    (raw: WorkerProductAiWriteResultDto) => toBffProductAiWriteResultDto(raw),
    120_000,
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
