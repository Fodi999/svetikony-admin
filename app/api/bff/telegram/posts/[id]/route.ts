import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../../../_lib/proxy";
import { toBffTelegramPostDto, type WorkerTelegramPostDto, type WorkerTelegramPostWritePayload } from "../_contract";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.telegram.posts}/${encodeURIComponent(id)}`, undefined, (raw: WorkerTelegramPostDto) =>
    toBffTelegramPostDto(raw),
  );
}

/** The Worker rejects with 409 if the post has already been sent — passed
 * through unchanged, nothing to map on an error response. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerTelegramPostWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.posts}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}
