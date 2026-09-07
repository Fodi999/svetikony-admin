import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 1B.2: mock-mode e2e used to run against `next build && next
 * start` — a real, NODE_ENV=production server. Once getApiClient()'s
 * canUseMock hard-invariant shipped (production can never select mock auth,
 * regardless of NEXT_PUBLIC_FORCE_MOCK_API — see lib/api/index.ts), that
 * server would silently fall back to the REAL adapter instead of mock,
 * breaking every mock-mode spec's assumptions rather than testing them.
 * `next build`/`next start` always set NODE_ENV=production themselves (a
 * Next.js CLI invariant), so mock mode can now only run against `next dev`
 * (always NODE_ENV=development) — which is also the only way to satisfy
 * the same invariant from the other direction: a real e2e run must not
 * need to weaken production security just to keep testing convenient.
 *
 * Two fully separate, explicit npm scripts select between the two modes —
 * see package.json:
 *   npm run test:e2e:mock  — this config, MOCK_MODE=true (the default
 *                            here), `next dev`, FORCE_MOCK_API=true.
 *   npm run test:e2e:real  — this config, MOCK_MODE=false (via
 *                            RUN_REAL_API_E2E=true), `next build && next
 *                            start`, FORCE_MOCK_API=false, talks to a
 *                            separately-running svet-ikony dev server on
 *                            :3001 (see e2e/*-real-api.spec.ts, which
 *                            self-skip unless RUN_REAL_API_E2E=true).
 * There is no bare `test:e2e` anymore — an unqualified command was exactly
 * the ambiguity that let a production-shaped server silently run mock
 * mode in the first place.
 */
const MOCK_MODE = process.env.RUN_REAL_API_E2E !== "true";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: MOCK_MODE
    ? {
        // Mock mode: `next dev` is the only runtime that can legitimately
        // activate mock auth post-Phase-1B.2 — see this file's own header
        // comment. `--webpack` matches this repo's other scripts (dev/build
        // both pin the webpack bundler, not Turbopack).
        command: "next dev --webpack",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { NEXT_PUBLIC_FORCE_MOCK_API: "true" },
      }
    : {
        // Real-API mode: never needs mock auth, so the production-only
        // mock-lockout invariant is irrelevant here — this keeps testing
        // against a real compiled build, same as before Phase 1B.2.
        command: "npm run build && npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { NEXT_PUBLIC_FORCE_MOCK_API: "false" },
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],
});
