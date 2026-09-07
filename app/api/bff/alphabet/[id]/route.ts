import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../_lib/auth";
import { proxyAndMap } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffAlphabetLetterDto, type WorkerAlphabetLetterDto } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-letter endpoint.
 * Returns a BffAlphabetLetterDto, not the raw Worker row. */
async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.alphabetLetters}/${encodeURIComponent(id)}`, undefined, (raw: WorkerAlphabetLetterDto) =>
    toBffAlphabetLetterDto(raw),
  );
}

export const GET = withAuth(POLICY.contentView, handleGet);
