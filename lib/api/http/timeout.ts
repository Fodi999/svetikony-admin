/**
 * Shared by the client-side transport (lib/api/http/transport.ts) and the
 * server-side BFF proxy (app/api/bff/_lib/proxy.ts) — both need "abort the
 * fetch after N ms, always clear the timer" and nothing more. Kept generic
 * and secret-free so it's safe to import from either side of the boundary.
 */
export function createAbortTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
