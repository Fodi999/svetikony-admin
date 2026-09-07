import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../_lib/proxy";
import { POLICY } from "../_lib/route-policies";
import { toBffChurchInfoDto, type WorkerChurchInfoDto, type WorkerChurchInfoWritePayload } from "./_contract";

/**
 * Singleton resource — no `[id]` route. GET always resolves "the one row"
 * (or a synthetic empty/draft DTO at zero rows — see
 * svet-ikony's getChurchInfo()); PUT is the only write and behaves as an
 * upsert (create-on-first-save, update-thereafter — see putChurchInfo()).
 */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.churchInfo, undefined, (raw: WorkerChurchInfoDto) => toBffChurchInfoDto(raw));
}

async function handlePut(request: NextRequest) {
  const payload = (await request.json()) as WorkerChurchInfoWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.churchInfo, "PUT", payload, (raw: WorkerChurchInfoDto) => toBffChurchInfoDto(raw));
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const PUT = withAuth(POLICY.contentEdit, handlePut);
