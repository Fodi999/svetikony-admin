import type { MediaApi, UploadProgressHandler } from "@/lib/api/client";
import { mockDelay, nextId, nowIso } from "@/lib/api/mock-utils";
import { mockMediaAssets } from "@/lib/mock-data/media";
import { ApiError, type MediaObjectDto } from "@/types/api";
import type { MediaAsset } from "@/types/entities";

// Not persisted to sessionStorage: uploaded assets use blob: object URLs
// (see upload() below) which are invalidated on reload anyway, so
// surviving a refresh would just leave broken image/audio links.
const store: MediaAsset[] = [...mockMediaAssets];

const MAX_SIZE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_PREFIXES = ["image/", "audio/"];

function kindFor(mimeType: string): MediaAsset["kind"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export const mediaResource: MediaApi = {
  async upload(file: File, onProgress?: UploadProgressHandler) {
    if (!ACCEPTED_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
      throw new ApiError("validation_error", "Непідтримуваний тип файлу", {
        fieldErrors: [{ path: "file", message: "Дозволені лише зображення та аудіо" }],
      });
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new ApiError("validation_error", "Файл завеликий (максимум 15 МБ)", {
        fieldErrors: [{ path: "file", message: "Максимальний розмір — 15 МБ" }],
      });
    }

    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await mockDelay(120);
      onProgress?.(Math.round((i / steps) * 100));
    }

    const objectUrl = typeof URL !== "undefined" ? URL.createObjectURL(file) : "";
    const asset: MediaAsset = {
      id: nextId("media"),
      url: objectUrl,
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      kind: kindFor(file.type),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.unshift(asset);
    return asset;
  },

  async list() {
    await mockDelay();
    return [...store];
  },

  async remove(id: string) {
    await mockDelay();
    const index = store.findIndex((asset) => asset.id === id);
    if (index !== -1) store.splice(index, 1);
  },

  /** Mock counterpart of the real R2 listing (see lib/api/http/media.ts) —
   * `module` has no meaning here since mock assets aren't namespaced by
   * upload module, so it's ignored rather than filtering to nothing. */
  async listObjects(): Promise<{ items: MediaObjectDto[]; cursor: string | null }> {
    await mockDelay();
    const items: MediaObjectDto[] = store.map((asset) => ({
      key: asset.id,
      url: asset.url,
      contentType: asset.mimeType,
      size: asset.sizeBytes,
      kind: asset.kind === "document" ? "image" : asset.kind,
    }));
    return { items, cursor: null };
  },
};
