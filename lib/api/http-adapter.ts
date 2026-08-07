import type { ApiClient } from "@/lib/api/client";
import { alphabetLettersHttpResource } from "@/lib/api/http/alphabet";
import { calendarDaysHttpResource } from "@/lib/api/http/calendar-days";
import { iconsHttpResource } from "@/lib/api/http/icons";
import { mediaHttpResource } from "@/lib/api/http/media";
import { prayersHttpResource } from "@/lib/api/http/prayers";
import { categoriesHttpResource } from "@/lib/api/http/product-categories";
import { productsHttpResource } from "@/lib/api/http/products";
import { mockApiAdapter } from "@/lib/api/mock-adapter";

/**
 * This is what `getApiClient()` returns by default now (see lib/api/index.ts) —
 * only `NEXT_PUBLIC_FORCE_MOCK_API=true` bypasses it in favor of the plain
 * mock adapter.
 *
 * Alphabet is READ-only against the real svet-ikony API; its
 * create/update/remove throw a controlled `not_implemented` ApiError (see
 * lib/api/http/alphabet.ts) rather than falling back to the mock store, so
 * a write attempt never silently "succeeds" without touching D1.
 *
 * `calendarDays` (Stage 2H), `prayers` (Stage 2I), `categories`/`products`
 * (Stage 2J), and `icons` (Stage 2K) have full real CRUD — list/get/
 * create/update/remove all reach real D1 (and, via their image fields,
 * real R2). All fully replace MockApiAdapter's resource; no sessionStorage
 * fallback is reachable for any of them. `products` intentionally leaves
 * `linkedIconId`/`dimensions`/`materials`/`variants` UI-only — no matching
 * real D1 column/table exists yet (see lib/api/http/products.ts). `icons`
 * intentionally leaves `relatedPrayerIds`/`relatedArticleIds`/
 * `relatedCalendarDayIds`/`history`/`saintImageDescription`/`materials`/
 * `dimensions` UI-only for the same reason (`galleryImageIds` IS real —
 * migration 0005 added a proper gallery column) (see lib/api/http/icons.ts).
 *
 * `media`: `uploadObject` (Stage 2D) and `remove` (Stage 2H, keyed by R2
 * object key, not a mock asset id) are real. `upload`/`list` — the Stage 1
 * mock media-library shape — still throw `not_implemented`; nothing in
 * features/media/** calls the real methods directly, only per-module
 * upload buttons do.
 *
 * Every other resource still delegates to the mock adapter — no other
 * module has been verified against the real svet-ikony API yet.
 */
export function createHttpApiAdapter(): ApiClient {
  return {
    ...mockApiAdapter,
    alphabetLetters: alphabetLettersHttpResource,
    prayers: prayersHttpResource,
    calendarDays: calendarDaysHttpResource,
    categories: categoriesHttpResource,
    products: productsHttpResource,
    icons: iconsHttpResource,
    media: mediaHttpResource,
  };
}
