import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap } from "../../_lib/proxy";
import { toBffAlphabetLetterDto, type WorkerAlphabetLetterDto } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-letter endpoint.
 * Returns a BffAlphabetLetterDto, not the raw Worker row. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.alphabetLetters}/${encodeURIComponent(id)}`, undefined, (raw: WorkerAlphabetLetterDto) =>
    toBffAlphabetLetterDto(raw),
  );
}
