import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const FLAG = "NEXT_PUBLIC_FORCE_MOCK_API";

async function freshClient(): Promise<import("@/lib/api/client").ApiClient> {
  const { getApiClient } = await import("./index");
  return getApiClient();
}

beforeEach(() => {
  vi.resetModules();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env[FLAG];
});

/**
 * Phase 1B.2 — the hard security invariant this whole test suite exists to
 * prove: a production build can NEVER select mockApiAdapter (and therefore
 * never mock authentication), regardless of NEXT_PUBLIC_FORCE_MOCK_API's
 * value. Phase 1B.1 only checked the flag, which meant `next build && next
 * start` with FORCE_MOCK_API=true (Playwright's old mock-e2e setup) — a
 * real, NODE_ENV=production build — still activated full mock auth. That
 * contradicted "production uses real auth only" and is exactly what this
 * matrix is designed to catch if it ever regresses.
 *
 * All 6 documented combinations, none skipped. Unlike Phase 1B.1's
 * `require()`-based mock loading (needed then for a *bundle content*
 * concern now solved independently by next.config.ts's
 * NormalModuleReplacementPlugin, see that file), getApiClient() is back to
 * a plain static import — so every case here, including
 * production+FORCE_MOCK=true, is directly exercisable: it only needs to
 * prove `canUseMock` correctly evaluates to false and the REAL adapter is
 * returned, which never requires actually loading the mock module.
 */
describe("getApiClient() adapter selection — full security matrix", () => {
  it("NODE_ENV=production, FORCE_MOCK_API unset -> REAL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env[FLAG];
    const { mockApiAdapter } = await import("./mock-adapter");
    const client = await freshClient();
    expect(client).not.toBe(mockApiAdapter);
    expect(client.auth).not.toBe(mockApiAdapter.auth);
  });

  it("NODE_ENV=production, FORCE_MOCK_API=false -> REAL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env[FLAG] = "false";
    const { mockApiAdapter } = await import("./mock-adapter");
    const client = await freshClient();
    expect(client).not.toBe(mockApiAdapter);
    expect(client.auth).not.toBe(mockApiAdapter.auth);
  });

  it("NODE_ENV=production, FORCE_MOCK_API=true -> REAL (the critical regression case: production must fail closed even when the flag says otherwise)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env[FLAG] = "true";
    const { mockApiAdapter } = await import("./mock-adapter");
    const { authHttpResource } = await import("./http/auth");
    const client = await freshClient();
    expect(client).not.toBe(mockApiAdapter);
    expect(client.auth).toBe(authHttpResource);
    expect(client.auth).not.toBe(mockApiAdapter.auth);
  });

  it("NODE_ENV=development, FORCE_MOCK_API unset -> REAL", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env[FLAG];
    const { mockApiAdapter } = await import("./mock-adapter");
    const client = await freshClient();
    expect(client).not.toBe(mockApiAdapter);
  });

  it("NODE_ENV=development, FORCE_MOCK_API=false -> REAL", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env[FLAG] = "false";
    const { mockApiAdapter } = await import("./mock-adapter");
    const client = await freshClient();
    expect(client).not.toBe(mockApiAdapter);
  });

  it("NODE_ENV=development, FORCE_MOCK_API=true -> MOCK (the only combination that legitimately activates mock auth)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env[FLAG] = "true";
    const { mockApiAdapter } = await import("./mock-adapter");
    const client = await freshClient();
    expect(client).toBe(mockApiAdapter);
    expect(client.auth).toBe(mockApiAdapter.auth);
  });
});

describe("getApiClient() resource-level composition (default, real adapter)", () => {
  it("switches alphabetLetters, prayers, calendarDays, categories, products, icons, articles, gospelReadings, churchInfo, media, and auth to the real HTTP resource, leaving the 2 still-temporary resources on mock", async () => {
    delete process.env[FLAG];
    const { mockApiAdapter } = await import("./mock-adapter");
    const { alphabetLettersHttpResource } = await import("./http/alphabet");
    const { prayersHttpResource } = await import("./http/prayers");
    const { calendarDaysHttpResource } = await import("./http/calendar-days");
    const { categoriesHttpResource } = await import("./http/product-categories");
    const { productsHttpResource } = await import("./http/products");
    const { iconsHttpResource } = await import("./http/icons");
    const { articlesHttpResource } = await import("./http/articles");
    const { gospelReadingsHttpResource } = await import("./http/gospel");
    const { churchInfoHttpResource } = await import("./http/church-info");
    const { mediaHttpResource } = await import("./http/media");
    const { authHttpResource } = await import("./http/auth");
    const client = await freshClient();
    expect(client.alphabetLetters).toBe(alphabetLettersHttpResource);
    expect(client.prayers).toBe(prayersHttpResource);
    expect(client.calendarDays).toBe(calendarDaysHttpResource);
    expect(client.categories).toBe(categoriesHttpResource);
    expect(client.products).toBe(productsHttpResource);
    expect(client.icons).toBe(iconsHttpResource);
    expect(client.articles).toBe(articlesHttpResource);
    expect(client.gospelReadings).toBe(gospelReadingsHttpResource);
    expect(client.churchInfo).toBe(churchInfoHttpResource);
    expect(client.media).toBe(mediaHttpResource);
    expect(client.auth).toBe(authHttpResource);
    expect(client.orders).toBe(mockApiAdapter.orders);
    expect(client.dashboard).toBe(mockApiAdapter.dashboard);
  });
});
