import { createAbortTimeout, isAbortError } from "@/lib/api/http/timeout";

/**
 * Server-only. Never import this from a "use client" component — it reads
 * SVET_IKONY_ADMIN_TOKEN, which must never reach the browser bundle.
 *
 * Every module's BFF route calls `proxyAndMap()` with its own per-module
 * mapper (see app/api/bff/<module>/_contract.ts): fetch the upstream Worker
 * response, and on success, replace the raw Worker DTO with a stable BFF DTO
 * before it ever reaches the browser — the point being that Worker DTOs
 * (siteId, isGlobal, translationGroupId when unused, etc.) must never leak
 * over the wire just because the code happens not to read them client-side.
 * Error responses (4xx/5xx) are passed through unchanged — their envelope
 * (`{code, message, details?}`) is already the stable contract normalized by
 * lib/api/http/transport.ts, so there is nothing to map.
 *
 * Every response carries Cache-Control: no-store — this proxies live D1 data
 * behind an admin-only JWT, so it must never be cached by the browser, a
 * CDN, or any intermediary.
 */

const REQUEST_TIMEOUT_MS = 10_000;
const NO_STORE_HEADERS = { "cache-control": "no-store" };

function errorResponse(status: number, code: string, message: string, details: string): Response {
  return Response.json({ code, message, details }, { status, headers: NO_STORE_HEADERS });
}

/** Resolves config + fetches upstream. Returns either the still-unread
 * upstream Response (`{ response }`) or an already-final error Response
 * (`{ error }`) for config/network/timeout failures. */
async function fetchUpstream(
  upstreamPath: string,
  searchParams?: URLSearchParams,
): Promise<{ response: Response } | { error: Response }> {
  const baseUrl = process.env.SVET_IKONY_API_BASE_URL;
  const token = process.env.SVET_IKONY_ADMIN_TOKEN;

  if (!baseUrl) {
    return { error: errorResponse(401, "AUTHENTICATION_ERROR", "Authentication failed", "SVET_IKONY_API_BASE_URL is not configured") };
  }
  if (!token) {
    return { error: errorResponse(401, "AUTHENTICATION_ERROR", "Authentication failed", "SVET_IKONY_ADMIN_TOKEN is not configured") };
  }

  const url = new URL(upstreamPath, baseUrl);
  searchParams?.forEach((value, key) => url.searchParams.set(key, value));

  const { signal, clear } = createAbortTimeout(REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal,
      cache: "no-store",
    });
    return { response };
  } catch (error) {
    const details = isAbortError(error)
      ? "Upstream request timed out"
      : error instanceof Error
        ? error.message
        : "Network error contacting upstream API";
    return { error: errorResponse(502, "NETWORK_ERROR", "Network error", details) };
  } finally {
    clear();
  }
}

/**
 * Fetch `upstreamPath`, and on a 2xx response, replace the raw Worker JSON
 * with `mapFn(raw)` before returning it to the browser. `TIn`/`TOut` are
 * deliberately generic over both a single object (item routes) and an array
 * (list routes) — the caller's mapFn decides which.
 *
 * Non-2xx upstream responses are passed through unchanged (same status,
 * same `{code, message, details?}` body) — that envelope is already the
 * stable error contract, nothing to map. A malformed (non-JSON) upstream
 * body, or a mapFn that throws, degrades to a safe 502 instead of crashing
 * the route.
 */
export async function proxyAndMap<TIn, TOut>(
  upstreamPath: string,
  searchParams: URLSearchParams | undefined,
  mapFn: (raw: TIn) => TOut,
): Promise<Response> {
  const result = await fetchUpstream(upstreamPath, searchParams);
  if ("error" in result) return result.error;

  const upstreamResponse = result.response;
  const bodyText = await upstreamResponse.text();

  if (!upstreamResponse.ok) {
    return new Response(bodyText, {
      status: upstreamResponse.status,
      headers: {
        "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
        ...NO_STORE_HEADERS,
      },
    });
  }

  let mapped: TOut;
  try {
    const raw = JSON.parse(bodyText) as TIn;
    mapped = mapFn(raw);
  } catch {
    return errorResponse(502, "INTERNAL_ERROR", "Invalid upstream response", "Upstream response was not valid JSON or failed to map");
  }

  return Response.json(mapped, { status: 200, headers: NO_STORE_HEADERS });
}

/**
 * Forwards a multipart/form-data upload to an upstream Worker admin
 * endpoint. Unlike proxyAndMap(), the response body is passed through
 * verbatim on success too — the Worker's upload route (Stage 2D) already
 * returns exactly the stable MediaObjectDto shape with no internal fields,
 * so there is nothing left to map here.
 *
 * The incoming FormData is re-sent as a fresh FormData, not hand-encoded:
 * `fetch` derives the multipart Content-Type (including a correct, freshly
 * generated boundary) from the FormData object itself, so the File's binary
 * content passes through unmodified without this code ever touching the
 * boundary string by hand.
 */
export async function proxyMultipartUpload(upstreamPath: string, formData: FormData): Promise<Response> {
  const baseUrl = process.env.SVET_IKONY_API_BASE_URL;
  const token = process.env.SVET_IKONY_ADMIN_TOKEN;

  if (!baseUrl) {
    return errorResponse(401, "AUTHENTICATION_ERROR", "Authentication failed", "SVET_IKONY_API_BASE_URL is not configured");
  }
  if (!token) {
    return errorResponse(401, "AUTHENTICATION_ERROR", "Authentication failed", "SVET_IKONY_ADMIN_TOKEN is not configured");
  }

  const url = new URL(upstreamPath, baseUrl);
  const { signal, clear } = createAbortTimeout(REQUEST_TIMEOUT_MS);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal,
    });
  } catch (error) {
    const details = isAbortError(error)
      ? "Upstream request timed out"
      : error instanceof Error
        ? error.message
        : "Network error contacting upstream API";
    return errorResponse(502, "NETWORK_ERROR", "Network error", details);
  } finally {
    clear();
  }

  const bodyText = await upstreamResponse.text();
  return new Response(bodyText, {
    status: upstreamResponse.status,
    headers: {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
      ...NO_STORE_HEADERS,
    },
  });
}
