import type { ApiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import { loadStore, mockDelay, nextId, nowIso, saveStore } from "@/lib/api/mock-utils";
import { mockVisualizerModels } from "@/lib/mock-data/visualizer-events";
import type { VisualizerModel } from "@/types/entities";

const STORE_KEY = "visualizerModels";
const store: VisualizerModel[] = loadStore(STORE_KEY, mockVisualizerModels);
const persist = () => saveStore(STORE_KEY, store);

export const visualizerModelsResource: ApiClient["visualizerModels"] = {
  async list(query) {
    await mockDelay();
    if (query?.eventGroupId) return store.filter((m) => m.eventGroupId === query.eventGroupId);
    return [...store];
  },

  async create(payload) {
    await mockDelay();
    const entity: VisualizerModel = {
      id: nextId("visualizer-model"),
      eventGroupId: payload.eventGroupId,
      title: payload.title,
      r2Key: payload.r2Key,
      filename: payload.filename,
      mimeType: payload.mimeType,
      fileSize: payload.fileSize,
      isBaseEarth: false,
      sortOrder: store.length,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.push(entity);
    persist();
    return entity;
  },

  async update(id, payload) {
    const model = store.find((item) => item.id === id);
    if (!model) throw new ApiError("not_found", "Модель не знайдено");
    Object.assign(model, payload, { updatedAt: nowIso() });
    persist();
    return model;
  },
  async remove(id, options) {
    await mockDelay();
    const index = store.findIndex((m) => m.id === id);
    if (index === -1) return;
    if (store[index].isBaseEarth && !options?.force) {
      throw new ApiError("validation_error", "Cannot delete the active Base Earth Model without force", { status: 400 });
    }
    store.splice(index, 1);
    persist();
  },

  async setBaseEarth(id) {
    await mockDelay();
    const target = store.find((m) => m.id === id);
    if (!target) throw new ApiError("not_found", "Модель не знайдено", { status: 404 });
    for (const model of store) model.isBaseEarth = model.id === id;
    persist();
    return target;
  },
};
