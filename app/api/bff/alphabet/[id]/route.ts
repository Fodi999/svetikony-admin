import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import {
  toBffAlphabetLetterDto,
  type WorkerAlphabetLetterDto,
  type WorkerAlphabetLetterWritePayload,
} from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-letter endpoint.
 * Returns a BffAlphabetLetterDto, not the raw Worker row. */
async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.alphabetLetters}/${encodeURIComponent(id)}`, undefined, (raw: WorkerAlphabetLetterDto) =>
    toBffAlphabetLetterDto(raw),
  );
}

async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerAlphabetLetterWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.alphabetLetters}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerAlphabetLetterDto) => toBffAlphabetLetterDto(raw),
  );
}

async function handleDelete(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.alphabetLetters}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const PUT = withAuth(POLICY.contentEdit, handlePut);
export const DELETE = withAuth(POLICY.contentEdit, handleDelete);
