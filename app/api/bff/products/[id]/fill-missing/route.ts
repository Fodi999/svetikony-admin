import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffProductAiFillResultDto, type WorkerProductAiFillResultDto } from "../../_contract";

async function handlePost(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.products}/${encodeURIComponent(id)}/fill-missing`,
    "POST",
    undefined,
    (raw: WorkerProductAiFillResultDto) => toBffProductAiFillResultDto(raw),
    120_000,
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
