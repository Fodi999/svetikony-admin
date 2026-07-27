import type { ApiClient } from "@/lib/api/client";

/**
 * Stage 2 placeholder. Do NOT implement or call this during Stage 1.
 *
 * When Stage 2 starts:
 *  1. Confirm real endpoint paths against the svet-ikony API (see the
 *     warning in lib/api/endpoints.ts) — do not assume ENDPOINTS is correct.
 *  2. Confirm the real response envelope/shape and reconcile with types/api.ts.
 *  3. Implement every ApiClient method here using fetch against a
 *     server-only base URL (never NEXT_PUBLIC_*), routed through BFF routes
 *     for anything that needs the session cookie.
 *  4. Swap `getApiClient()` in lib/api/index.ts to return this adapter behind
 *     a USE_REAL_API feature flag, keeping mockApiAdapter available as a
 *     fallback for local development.
 */
export function createHttpApiAdapter(): ApiClient {
  throw new Error(
    "HttpApiAdapter is a Stage 2 deliverable and has not been implemented yet.",
  );
}
