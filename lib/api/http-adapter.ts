import type { ApiClient } from "@/lib/api/client";
import { alphabetLettersHttpResource } from "@/lib/api/http/alphabet";
import { articlesHttpResource } from "@/lib/api/http/articles";
import { authHttpResource } from "@/lib/api/http/auth";
import { calendarDaysHttpResource } from "@/lib/api/http/calendar-days";
import { churchInfoHttpResource } from "@/lib/api/http/church-info";
import { gospelReadingsHttpResource } from "@/lib/api/http/gospel";
import { iconsHttpResource } from "@/lib/api/http/icons";
import { mediaHttpResource } from "@/lib/api/http/media";
import { ordersHttpResource } from "@/lib/api/http/orders";
import { prayersHttpResource } from "@/lib/api/http/prayers";
import { categoriesHttpResource } from "@/lib/api/http/product-categories";
import { productsHttpResource } from "@/lib/api/http/products";
import { saintsHttpResource } from "@/lib/api/http/saints";
import { telegramHttpResource } from "@/lib/api/http/telegram";
import { dashboardResource } from "@/lib/api/mock/dashboard";

/**
 * This is what `getApiClient()` returns by default now (see lib/api/index.ts) —
 * only `NEXT_PUBLIC_FORCE_MOCK_API=true` bypasses it in favor of the plain
 * mock adapter.
 *
 * Phase 1B.1: this used to spread `...mockApiAdapter` (the whole
 * lib/api/mock-adapter.ts module, all 15 resources) as its base and
 * override the verified ones on top. That pulled `lib/api/mock/auth.ts` —
 * and through it `lib/mock-data/users.ts`'s plaintext demo passwords —
 * into every production build's dependency graph, even though `auth` was
 * always immediately overridden below and the mock login path was never
 * reachable at runtime. Overriding a property after a spread doesn't stop
 * a bundler from having to evaluate the spread source first, so the
 * plaintext credentials still ended up in the compiled output (confirmed
 * by grepping .next/static/ — see the Phase 1B.1 report). Fixed by naming
 * every property explicitly instead of spreading: 10 real resources below,
 * plus the 5 still-temporary ones (orders/articles/gospelReadings/
 * churchInfo/dashboard) imported directly from their own individual mock
 * resource modules — never from lib/api/mock-adapter.ts, and critically,
 * never from lib/api/mock/auth.ts. This function's whole import graph now
 * has zero edges into the mock auth implementation.
 *
 * Alphabet is READ-only against the real svet-ikony API; its
 * create/update/remove throw a controlled `not_implemented` ApiError (see
 * lib/api/http/alphabet.ts) rather than falling back to the mock store, so
 * a write attempt never silently "succeeds" without touching D1.
 *
 * `calendarDays` (Stage 2H), `prayers` (Stage 2I), `categories`/`products`
 * (Stage 2J), `icons` (Stage 2K), and `saints` (Stage 2L) have full real
 * CRUD — list/get/create/update/remove all reach real D1 (and, via their
 * image fields, real R2). `products` intentionally leaves
 * `linkedIconId`/`dimensions`/`materials`/`variants` UI-only — no matching
 * real D1 column/table exists yet (see lib/api/http/products.ts). `icons`
 * intentionally leaves `relatedPrayerIds`/`relatedArticleIds`/
 * `relatedCalendarDayIds`/`history`/`saintImageDescription`/`materials`/
 * `dimensions` UI-only for the same reason (`galleryImageIds` IS real —
 * migration 0005 added a proper gallery column) (see
 * lib/api/http/icons.ts). `saints` leaves
 * `relatedIconIds`/`relatedCalendarDayIds` UI-only — the Worker only has a
 * single `icon_id`/`calendar_day_id` FK per saint, not the many-to-many
 * shape the admin's relation picker needs (see lib/api/http/saints.ts).
 *
 * `media`: `uploadObject` (Stage 2D), `remove` (Stage 2H, keyed by R2
 * object key, not a mock asset id), and `listObjects` (Telegram media
 * picker) are real. `upload`/`list` — the Stage 1 mock media-library shape
 * — still throw `not_implemented`; nothing in features/media/** calls the
 * real methods directly, only per-module upload buttons do.
 *
 * `telegram` (bot management: Dashboard/Audience/Today/Posts) is fully
 * real — every method reaches svet-ikony's D1-backed `/api/admin/telegram/*`
 * routes via the BFF, no mock fallback for any of it.
 *
 * `auth` (Phase 1B) is fully real — login/session/logout all go through
 * app/api/bff/auth/**, which in turn call svet-ikony's Phase 1A
 * /api/admin/auth/** routes. No sessionStorage/mockAccounts path is
 * reachable here, and — as of Phase 1B.1 — none of that mock's code is
 * even in this function's build output; it stays wired only under
 * mockApiAdapter, used only when NEXT_PUBLIC_FORCE_MOCK_API=true (see
 * lib/api/index.ts and this function's own test in lib/api/index.test.ts,
 * which asserts production's default choice).
 *
 * `dashboard` is the 1 remaining still-temporary mock resource (not yet
 * wired to real D1) — imported directly from its own file, not through
 * mockApiAdapter/mock/auth.ts. `articles` (Phase 2B-2), `gospelReadings`
 * (Phase 2B-3), `churchInfo` (Phase 2B-4), and `orders` (Phase 2B-5B) are
 * the 4 already connected to real D1 — see lib/api/http/articles.ts,
 * lib/api/http/gospel.ts, lib/api/http/church-info.ts, and
 * lib/api/http/orders.ts.
 */
export function createHttpApiAdapter(): ApiClient {
  return {
    auth: authHttpResource,
    alphabetLetters: alphabetLettersHttpResource,
    prayers: prayersHttpResource,
    calendarDays: calendarDaysHttpResource,
    categories: categoriesHttpResource,
    products: productsHttpResource,
    icons: iconsHttpResource,
    saints: saintsHttpResource,
    articles: articlesHttpResource,
    gospelReadings: gospelReadingsHttpResource,
    churchInfo: churchInfoHttpResource,
    orders: ordersHttpResource,
    media: mediaHttpResource,
    telegram: telegramHttpResource,
    dashboard: dashboardResource,
  };
}
