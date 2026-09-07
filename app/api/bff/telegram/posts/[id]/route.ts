import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffTelegramPostDto, type WorkerTelegramPostDto, type WorkerTelegramPostWritePayload } from "../_contract";

async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.telegram.posts}/${encodeURIComponent(id)}`, undefined, (raw: WorkerTelegramPostDto) =>
    toBffTelegramPostDto(raw),
  );
}

/** The Worker rejects with 409 if the post has already been sent — passed
 * through unchanged, nothing to map on an error response. */
async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerTelegramPostWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.telegram.posts}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw),
  );
}

export const GET = withAuth(POLICY.telegramView, handleGet);
export const PUT = withAuth(POLICY.telegramEdit, handlePut);
