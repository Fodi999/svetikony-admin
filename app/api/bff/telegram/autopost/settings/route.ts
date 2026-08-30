import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyAndMap, proxyJsonWrite } from "../../../_lib/proxy";
import { toBffAutopostSettingsDto, type WorkerAutopostSettingsDto, type WorkerAutopostSettingsWritePayload } from "./_contract";

export async function GET() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.autopostSettings, undefined, (raw: WorkerAutopostSettingsDto) =>
    toBffAutopostSettingsDto(raw),
  );
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as WorkerAutopostSettingsWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.telegram.autopostSettings, "PUT", payload, (raw: WorkerAutopostSettingsDto) =>
    toBffAutopostSettingsDto(raw),
  );
}
