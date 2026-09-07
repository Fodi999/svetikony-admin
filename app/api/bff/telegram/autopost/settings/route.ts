import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffAutopostSettingsDto, type WorkerAutopostSettingsDto, type WorkerAutopostSettingsWritePayload } from "./_contract";

async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.autopostSettings, undefined, (raw: WorkerAutopostSettingsDto) =>
    toBffAutopostSettingsDto(raw),
  );
}

async function handlePut(request: Request) {
  const payload = (await request.json()) as WorkerAutopostSettingsWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.telegram.autopostSettings, "PUT", payload, (raw: WorkerAutopostSettingsDto) =>
    toBffAutopostSettingsDto(raw),
  );
}

export const GET = withAuth(POLICY.telegramView, handleGet);
export const PUT = withAuth(POLICY.telegramEdit, handlePut);
