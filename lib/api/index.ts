import type { ApiClient } from "@/lib/api/client";
import { mockApiAdapter } from "@/lib/api/mock-adapter";

/**
 * Single seam feature code should import through. Stage 1 always resolves
 * to the mock adapter; Stage 2 adds a USE_REAL_API check here to switch to
 * HttpApiAdapter without touching any feature/UI code.
 */
export function getApiClient(): ApiClient {
  return mockApiAdapter;
}

export const apiClient = getApiClient();
