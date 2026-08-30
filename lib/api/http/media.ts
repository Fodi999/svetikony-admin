import type { ApiClient } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { createAbortTimeout, isAbortError } from "@/lib/api/http/timeout";
import { notImplementedError } from "@/lib/api/http/resource-factory";
import { httpDelete, httpGet } from "@/lib/api/http/transport";
import { ApiError, type ApiErrorCode, type MediaObjectDto } from "@/types/api";

const REQUEST_TIMEOUT_MS = 30_000; // uploads take longer than a plain JSON GET

const BACKEND_CODE_MAP: Record<string, ApiErrorCode> = {
  AUTHENTICATION_ERROR: "unauthorized",
  AUTHORIZATION_ERROR: "forbidden",
  NOT_FOUND: "not_found",
  VALIDATION_ERROR: "validation_error",
  CONFLICT: "conflict",
  UNSUPPORTED_MEDIA_TYPE: "validation_error",
  PAYLOAD_TOO_LARGE: "validation_error",
  INTERNAL_ERROR: "server_error",
  DATABASE_ERROR: "server_error",
  NETWORK_ERROR: "network_error",
};

interface BackendErrorBody {
  code?: string;
  message?: string;
  details?: string;
}

/**
 * Real upload through the BFF (see app/api/bff/media/upload/route.ts). Not
 * built on lib/api/http/transport.ts's httpGet — this is a POST with a
 * FormData body, not a GET expecting JSON, and needs a longer timeout for
 * larger files. Error-code normalization mirrors transport.ts's mapping so
 * ApiError codes stay consistent across every HttpApiAdapter resource.
 */
async function uploadObject(input: { file: File; module: string; entityId: string; purpose: string }): Promise<MediaObjectDto> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("module", input.module);
  form.append("entityId", input.entityId);
  form.append("purpose", input.purpose);

  const { signal, clear } = createAbortTimeout(REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(BFF_ENDPOINTS.mediaUpload, { method: "POST", body: form, signal });
  } catch (error) {
    if (isAbortError(error)) {
      throw new ApiError("network_error", "Час очікування відповіді сплив");
    }
    throw new ApiError("network_error", "Немає з'єднання з сервером. Перевірте інтернет і спробуйте ще раз.");
  } finally {
    clear();
  }

  const rawText = await response.text();

  if (!response.ok) {
    let body: BackendErrorBody = {};
    try {
      body = rawText ? (JSON.parse(rawText) as BackendErrorBody) : {};
    } catch {
      // Non-JSON error body — fall through with a generic message.
    }
    const code: ApiErrorCode = (body.code && BACKEND_CODE_MAP[body.code]) || "unknown";
    throw new ApiError(code, body.details || body.message || `HTTP ${response.status}`, { status: response.status });
  }

  try {
    return JSON.parse(rawText) as MediaObjectDto;
  } catch {
    throw new ApiError("unknown", "Некоректна відповідь сервера (invalid JSON)");
  }
}

/** Real R2 listing — see MediaApi.listObjects's doc comment. */
async function listObjects(input?: { module?: string; cursor?: string }): Promise<{ items: MediaObjectDto[]; cursor: string | null }> {
  const params = new URLSearchParams();
  if (input?.module) params.set("module", input.module);
  if (input?.cursor) params.set("cursor", input.cursor);
  const qs = params.toString();
  return httpGet<{ items: MediaObjectDto[]; cursor: string | null }>(qs ? `${BFF_ENDPOINTS.media}?${qs}` : BFF_ENDPOINTS.media);
}

/**
 * `remove` takes the R2 object key (as returned by `uploadObject`'s `key`),
 * not a mock media-library asset id — see MediaApi.remove's doc comment.
 * Stage 2H's first caller is Calendar Day's orphan-upload cleanup, but this
 * is generic and reusable by any module.
 */
async function remove(key: string): Promise<void> {
  await httpDelete(BFF_ENDPOINTS.media, { key });
}

/**
 * `uploadObject`/`remove` are real (Stage 2D/2H). `upload`/`list` are not
 * wired to any form yet and throw the same controlled `not_implemented`
 * guard every other HttpApiAdapter write path uses — this resource is not
 * spread into MockApiAdapter's `media`, it fully replaces it when active
 * (see lib/api/http-adapter.ts), so those must not silently no-op.
 */
export const mediaHttpResource: ApiClient["media"] = {
  async upload() {
    notImplementedError();
  },
  async list() {
    notImplementedError();
  },
  remove,
  uploadObject,
  listObjects,
};
