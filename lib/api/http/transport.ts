import { createAbortTimeout, isAbortError } from "@/lib/api/http/timeout";
import { ApiError, type ApiErrorCode } from "@/types/api";

/**
 * Client-safe fetch wrapper for this admin's own `/api/bff/**` routes
 * (same-origin, no secret involved on this side — see
 * app/api/bff/_lib/proxy.ts for where the upstream JWT actually lives).
 * Every HttpApiAdapter resource should go through this instead of calling
 * `fetch` directly, so error handling/timeouts stay consistent.
 */

const REQUEST_TIMEOUT_MS = 10_000;

/** Maps svet-ikony's ApiError.code values (lib/d1/errors.ts) — and this
 * admin's own BFF-level shortcut codes — to our ApiErrorCode union. */
const BACKEND_CODE_MAP: Record<string, ApiErrorCode> = {
  AUTHENTICATION_ERROR: "unauthorized",
  AUTHORIZATION_ERROR: "forbidden",
  NOT_FOUND: "not_found",
  VALIDATION_ERROR: "validation_error",
  CONFLICT: "conflict",
  INTERNAL_ERROR: "server_error",
  DATABASE_ERROR: "server_error",
  NETWORK_ERROR: "network_error",
};

interface BackendErrorBody {
  code?: string;
  message?: string;
  details?: string;
}

export async function httpGet<T>(path: string): Promise<T> {
  const { signal, clear } = createAbortTimeout(REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(path, {
      method: "GET",
      signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
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
      // Non-JSON error body from somewhere unexpected — fall through with a generic message.
    }
    const code: ApiErrorCode = (body.code && BACKEND_CODE_MAP[body.code]) || "unknown";
    throw new ApiError(code, body.details || body.message || `HTTP ${response.status}`, {
      status: response.status,
    });
  }

  if (!rawText) {
    return undefined as T;
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new ApiError("unknown", "Некоректна відповідь сервера (invalid JSON)");
  }
}

/** Shared implementation for httpPost/httpPut/httpDelete below — same
 * error handling/timeout/JSON parsing as httpGet, generalized for a
 * method + optional JSON body. */
async function httpWrite<T>(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<T> {
  const { signal, clear } = createAbortTimeout(REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
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
    let errorBody: BackendErrorBody = {};
    try {
      errorBody = rawText ? (JSON.parse(rawText) as BackendErrorBody) : {};
    } catch {
      // Non-JSON error body from somewhere unexpected — fall through with a generic message.
    }
    const code: ApiErrorCode = (errorBody.code && BACKEND_CODE_MAP[errorBody.code]) || "unknown";
    throw new ApiError(code, errorBody.details || errorBody.message || `HTTP ${response.status}`, {
      status: response.status,
    });
  }

  if (!rawText) {
    return undefined as T;
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new ApiError("unknown", "Некоректна відповідь сервера (invalid JSON)");
  }
}

export function httpPost<T>(path: string, body: unknown): Promise<T> {
  return httpWrite<T>(path, "POST", body);
}

export function httpPut<T>(path: string, body: unknown): Promise<T> {
  return httpWrite<T>(path, "PUT", body);
}

export function httpDelete(path: string, body?: unknown): Promise<void> {
  return httpWrite<void>(path, "DELETE", body);
}
