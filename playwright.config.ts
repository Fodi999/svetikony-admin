import { defineConfig, devices } from "@playwright/test";

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
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Plain `npm run test:e2e` must exercise the mock adapter, same as
    // before Stage 2 — real-API e2e specs are opt-in via RUN_REAL_API_E2E
    // and skip themselves otherwise (see e2e/*-real-api.spec.ts). getApiClient()
    // now defaults to the real HttpApiAdapter (see lib/api/index.ts), so mock
    // mode must be forced explicitly here rather than assumed. This only
    // takes effect when Playwright spawns a fresh server (CI, or no server
    // already on :3000); reuseExistingServer means a server you started
    // manually keeps whatever NEXT_PUBLIC_FORCE_MOCK_API it was started with.
    env: { NEXT_PUBLIC_FORCE_MOCK_API: process.env.RUN_REAL_API_E2E === "true" ? "false" : "true" },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],
});
