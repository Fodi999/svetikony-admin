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
 * Set NEXT_PUBLIC_FORCE_MOCK_API=true to force the mock adapter instead —
 * used by `npm run test:e2e:mock` (see playwright.config.ts, which now
 * runs mock-mode e2e against `next dev`, never a production build).
 *
 * HARD SECURITY INVARIANT (Phase 1B.2): mock mode requires BOTH
 * NEXT_PUBLIC_FORCE_MOCK_API === "true" AND NODE_ENV !== "production" — a
 * production build can NEVER select mockApiAdapter, regardless of the
 * flag's value. Phase 1B.1 shipped with only the flag check, which meant
 * `next build && next start` (Playwright's old mock-e2e setup) — a real,
 * NODE_ENV=production build — still activated full mock authentication
 * whenever FORCE_MOCK_API=true, an explicit contradiction of "production
 * uses real auth only". `next build`/`next start` always set
 * NODE_ENV=production themselves (a Next.js CLI invariant, not something
 * this flag or any env var can override), so this check alone makes mock
 * mode structurally unreachable in any real production build — not just
 * unlikely, not just discouraged by convention.
 *
 * This module now safely uses a plain static `import` for mockApiAdapter
 * again (Phase 1B.1 had switched this to a conditional `require()`,
 * chasing webpack dead-code elimination for the *bundle content* problem —
 * that turned out to need next.config.ts's NormalModuleReplacementPlugin
 * regardless, which operates at module-resolution level and is agnostic to
 * whether this file uses `import` or `require`. With the real fix living
 * there, this file can go back to being normally unit-testable — see
 * lib/api/index.test.ts's full 6-case matrix, none of which need `require()`
 * to succeed against a virtual test module anymore).
 */
const canUseMock = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FORCE_MOCK_API === "true";

export function getApiClient(): ApiClient {
  return canUseMock ? mockApiAdapter : createHttpApiAdapter();
}

export const apiClient = getApiClient();
