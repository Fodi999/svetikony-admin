import { expect, test } from "@playwright/test";

/**
 * Stage 2, Alphabet READ smoke test. Requires a second local dev server
 * (svet-ikony on :3001) plus NEXT_PUBLIC_USE_REAL_API=true in .env.local —
 * so plain `npm run test:e2e` must never depend on it. Opt in explicitly:
 *
 *   RUN_REAL_API_E2E=true npm run test:e2e -- e2e/alphabet-real-api.spec.ts
 */
test.describe("Alphabet via HttpApiAdapter (real local D1 data)", () => {
  test.skip(
    process.env.RUN_REAL_API_E2E !== "true",
    "Set RUN_REAL_API_E2E=true to run against the second local dev server (svet-ikony on :3001)",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Дмитро Адміністратор/ }).click();
    await page.getByRole("button", { name: "Увійти" }).click();
    await page.waitForURL("/");
  });

  test("loads the real 46 Ukrainian letters with no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    const listResponse = page.waitForResponse((response) => response.url().includes("/api/bff/alphabet?language=uk"));
    await page.goto("/alphabet");
    const response = await listResponse;
    expect(response.status()).toBe(200);
    const body = (await response.json()) as unknown[];
    expect(body).toHaveLength(46);

    await expect(page.getByText("Азъ", { exact: true })).toBeVisible();
    await expect(page.getByText("Буки", { exact: true })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("opens a single letter loaded from the real API", async ({ page }) => {
    await page.goto("/alphabet");
    await page.getByText("Азъ", { exact: true }).click();
    await page.waitForURL(/\/alphabet\/.+/);
    await expect(page.getByLabel("Slug")).toHaveValue("az");
    await expect(page.getByLabel("Назва букви")).toHaveValue("Азъ");
  });

  test("renders the mobile grid layout correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/alphabet");
    await expect(page.getByText("Азъ", { exact: true })).toBeVisible();
    const grid = page.locator(".grid").first();
    await expect(grid).toHaveClass(/grid-cols-3/);
  });

  test("TanStack Query cache avoids refetching within staleTime on revisit", async ({ page }) => {
    // Desktop viewport so the sidebar links used below for client-side
    // in-app navigation are visible (mobile hides them behind "Ще").
    await page.setViewportSize({ width: 1440, height: 900 });

    const bffRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/bff/alphabet")) bffRequests.push(request.url());
    });

    await page.goto("/alphabet");
    await expect(page.getByText("Азъ", { exact: true })).toBeVisible();
    // alphabet-grid-view fires two intentionally distinct list queries on
    // first mount: the unfiltered "all" query (completeness counts) and the
    // language-filtered "query" (grid contents) — not a duplicate, both are
    // real cache keys used by the existing Stage 1 component.
    const afterFirstLoad = bffRequests.length;
    expect(afterFirstLoad).toBeGreaterThan(0);

    // Client-side (soft) navigation away and back — unlike page.goto(), this
    // does not remount Providers/QueryClient, so the in-memory cache survives.
    await page.getByRole("link", { name: "Молитви" }).click();
    await page.waitForURL(/\/prayers/);
    await page.getByRole("link", { name: "Азбука" }).click();
    await page.waitForURL(/\/alphabet/);
    await expect(page.getByText("Азъ", { exact: true })).toBeVisible();
    expect(bffRequests.length).toBe(afterFirstLoad);

    await page.getByText("Азъ", { exact: true }).click();
    await page.waitForURL(/\/alphabet\/.+/);
    await expect(page.getByLabel("Slug")).toHaveValue("az");
    const afterFirstDetail = bffRequests.length;
    expect(afterFirstDetail).toBeGreaterThan(afterFirstLoad);

    await page.goBack();
    await page.getByText("Азъ", { exact: true }).click();
    await page.waitForURL(/\/alphabet\/.+/);
    await expect(page.getByLabel("Slug")).toHaveValue("az");
    expect(bffRequests.length).toBe(afterFirstDetail);
  });
});
