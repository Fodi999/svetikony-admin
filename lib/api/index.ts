import type { ApiClient } from "@/lib/api/client";
import { createHttpApiAdapter } from "@/lib/api/http-adapter";
import { mockApiAdapter } from "@/lib/api/mock-adapter";

/**
 * Single seam feature code should import through. Defaults to the mock
 * adapter so the app never accidentally calls the real API; set
 * NEXT_PUBLIC_USE_REAL_API=true locally to switch Alphabet's and Prayers'
 * data source to real D1 data via HttpApiAdapter (see lib/api/http-adapter.ts
 * for exactly which resources that affects).
 */
const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API === "true";

export function getApiClient(): ApiClient {
  return USE_REAL_API ? createHttpApiAdapter() : mockApiAdapter;
}

export const apiClient = getApiClient();
