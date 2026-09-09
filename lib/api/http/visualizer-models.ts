import type { BffVisualizerModelDto, WorkerVisualizerModelWritePayload } from "@/app/api/bff/visualizer-models/_contract";
import type { ApiClient } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { httpDelete, httpGet, httpPost } from "@/lib/api/http/transport";
import type { VisualizerModel } from "@/types/entities";

function toEntity(dto: BffVisualizerModelDto): VisualizerModel {
  return {
    id: dto.id,
    eventGroupId: dto.eventGroupId ?? undefined,
    title: dto.title || undefined,
    r2Key: dto.r2Key,
    filename: dto.filename || undefined,
    mimeType: dto.mimeType || undefined,
    fileSize: dto.fileSize || undefined,
    isBaseEarth: dto.isBaseEarth,
    sortOrder: dto.sortOrder,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export const visualizerModelsHttpResource: ApiClient["visualizerModels"] = {
  async list(query) {
    const params = new URLSearchParams();
    if (query?.eventGroupId) params.set("eventGroupId", query.eventGroupId);
    const qs = params.toString();
    const dtos = await httpGet<BffVisualizerModelDto[]>(qs ? `${BFF_ENDPOINTS.visualizerModels}?${qs}` : BFF_ENDPOINTS.visualizerModels);
    return dtos.map(toEntity);
  },
  async create(payload) {
    const body: WorkerVisualizerModelWritePayload = {
      eventGroupId: payload.eventGroupId ?? null,
      title: payload.title ?? "",
      r2Key: payload.r2Key,
      filename: payload.filename ?? "",
      mimeType: payload.mimeType ?? "",
      fileSize: payload.fileSize ?? 0,
    };
    const dto = await httpPost<BffVisualizerModelDto>(BFF_ENDPOINTS.visualizerModels, body);
    return toEntity(dto);
  },
  async remove(id, options) {
    const suffix = options?.force ? "?force=1" : "";
    await httpDelete(`${BFF_ENDPOINTS.visualizerModels}/${encodeURIComponent(id)}${suffix}`);
  },
  async setBaseEarth(id) {
    const dto = await httpPost<BffVisualizerModelDto>(`${BFF_ENDPOINTS.visualizerModels}/${encodeURIComponent(id)}/set-base-earth`, undefined);
    return toEntity(dto);
  },
};
