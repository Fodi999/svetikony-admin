import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../../_lib/auth";
import { proxyJsonWrite } from "../../../../_lib/proxy";
import { POLICY } from "../../../../_lib/route-policies";
import { toBffTelegramPostDto, type WorkerTelegramPostDto } from "../../_contract";

/** The double-publish guard lives entirely on the Worker side (409 if
 * already 'sent') — this proxy just forwards the request and passes any
 * error response through unchanged. */
async function handlePost(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.posts}/${encodeURIComponent(id)}/publish`,
    "POST",
    undefined,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}

export const POST = withAuth(POLICY.telegramEdit, handlePost);
