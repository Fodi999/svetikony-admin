import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import { toBffAlphabetLetterDtoList, type WorkerAlphabetLetterDto } from "./_contract";

/** Same-origin proxy for the verified svet-ikony alphabet list endpoint.
 * Safe to call from client-side code — see app/api/bff/_lib/proxy.ts.
 * Returns BffAlphabetLetterDto[], not the raw Worker row. */
async function handleGet(request: NextRequest) {
  const forwarded = new URLSearchParams();
  const language = request.nextUrl.searchParams.get("language");
  if (language) forwarded.set("language", language);
  return proxyAndMap(UPSTREAM_ENDPOINTS.alphabetLetters, forwarded, (raw: WorkerAlphabetLetterDto[]) =>
    toBffAlphabetLetterDtoList(raw),
  );
}

export const GET = withAuth(POLICY.contentView, handleGet);
