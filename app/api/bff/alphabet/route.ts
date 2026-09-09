import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import {
  toBffAlphabetLetterDto,
  toBffAlphabetLetterDtoList,
  type WorkerAlphabetLetterDto,
  type WorkerAlphabetLetterWritePayload,
} from "./_contract";

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

async function handlePost(request: NextRequest) {
  const payload = (await request.json()) as WorkerAlphabetLetterWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.alphabetLetters, "POST", payload, (raw: WorkerAlphabetLetterDto) =>
    toBffAlphabetLetterDto(raw),
  );
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const POST = withAuth(POLICY.contentEdit, handlePost);
