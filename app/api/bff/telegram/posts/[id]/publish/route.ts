import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../../_lib/proxy";
import { toBffTelegramPostDto, type WorkerTelegramPostDto } from "../../_contract";

/** The double-publish guard lives entirely on the Worker side (409 if
 * already 'sent') — this proxy just forwards the request and passes any
 * error response through unchanged. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.posts}/${encodeURIComponent(id)}/publish`,
    "POST",
    undefined,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}
