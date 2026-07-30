import type { ApiClient } from "@/lib/api/client";
import { createHttpApiAdapter } from "@/lib/api/http-adapter";
import { mockApiAdapter } from "@/lib/api/mock-adapter";

/**
 * Single seam feature code should import through. Defaults to real D1/R2
 * data via HttpApiAdapter (see lib/api/http-adapter.ts for exactly which
 * resources that actually reaches vs. still falls back to mock) — this
 * used to default to mock and require NEXT_PUBLIC_USE_REAL_API=true to opt
 * into real data, but that flag is only reliable when it's present in the
 * *build* environment. Cloudflare's Git-integrated Workers Builds pipeline
 * for this project has no supported way to configure that (confirmed: the
 * relevant dashboard/API surface returned 403 for the credentials
 * available), so a manually-set runtime secret never reached the compiled
 * client bundle — production kept silently running on mock. Flipping the
 * default removes the dependency on that build-time flag entirely.
 *
 * Set NEXT_PUBLIC_FORCE_MOCK_API=true to force the mock adapter instead
 * (used by plain `npm run test:e2e`, see playwright.config.ts).
 */
const FORCE_MOCK_API = process.env.NEXT_PUBLIC_FORCE_MOCK_API === "true";

export function getApiClient(): ApiClient {
  return FORCE_MOCK_API ? mockApiAdapter : createHttpApiAdapter();
}

export const apiClient = getApiClient();
