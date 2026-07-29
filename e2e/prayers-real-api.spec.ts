import { expect, test, type Page } from "@playwright/test";

/**
 * Stage 2C, Prayers READ smoke test. Requires a second local dev server
 * (svet-ikony on :3001) plus NEXT_PUBLIC_USE_REAL_API=true in .env.local —
 * so plain `npm run test:e2e` must never depend on it. Opt in explicitly:
 *
 *   RUN_REAL_API_E2E=true npm run test:e2e -- e2e/prayers-real-api.spec.ts
 *
 * Local real data currently has exactly one prayer ("Отче наш!!", slug
 * "отче-наш") — this test is deliberately written against that single real
 * record rather than assuming a larger dataset.
 */

/** prayer-list-view.tsx renders both a mobile-card list and a desktop table
 * unconditionally (CSS `md:hidden`/`hidden md:block` toggles which is
 * shown) — a plain text locator matches both regardless of viewport, so
 * scope to whichever copy is actually visible. */
function visiblePrayerTitle(page: Page) {
  return page.locator(':visible:text-is("Отче наш!!")');
}

test.describe("Prayers via HttpApiAdapter (real local D1 data)", () => {
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

  test("loads the real local prayer with no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    const listResponse = page.waitForResponse((response) => response.url().includes("/api/bff/prayers"));
    await page.goto("/prayers");
    const response = await listResponse;
    expect(response.status()).toBe(200);
    const body = (await response.json()) as unknown[];
    expect(body.length).toBeGreaterThanOrEqual(1);

    await expect(visiblePrayerTitle(page)).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("opens the real prayer and shows its mapped fields, including the safe prayerType fallback", async ({ page }) => {
    await page.goto("/prayers");
    await visiblePrayerTitle(page).click();
    await page.waitForURL(/\/prayers\/.+/);
    await expect(page.getByLabel("Slug")).toHaveValue("отче-наш");
    await expect(page.getByLabel("Назва")).toHaveValue("Отче наш!!");
  });

  test("renders the mobile card layout correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/prayers");
    await expect(visiblePrayerTitle(page)).toBeVisible();
  });

  test("TanStack Query cache avoids refetching within staleTime on revisit", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const bffRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/bff/prayers")) bffRequests.push(request.url());
    });

    await page.goto("/prayers");
    await expect(visiblePrayerTitle(page)).toBeVisible();
    const afterFirstLoad = bffRequests.length;
    expect(afterFirstLoad).toBeGreaterThan(0);

    await page.getByRole("link", { name: "Азбука" }).click();
    await page.waitForURL(/\/alphabet/);
    await page.getByRole("link", { name: "Молитви" }).click();
    await page.waitForURL(/\/prayers/);
    await expect(visiblePrayerTitle(page)).toBeVisible();
    expect(bffRequests.length).toBe(afterFirstLoad);

    await visiblePrayerTitle(page).click();
    await page.waitForURL(/\/prayers\/.+/);
    await expect(page.getByLabel("Slug")).toHaveValue("отче-наш");
    const afterFirstDetail = bffRequests.length;
    expect(afterFirstDetail).toBeGreaterThan(afterFirstLoad);

    await page.goBack();
    await visiblePrayerTitle(page).click();
    await page.waitForURL(/\/prayers\/.+/);
    await expect(page.getByLabel("Slug")).toHaveValue("отче-наш");
    expect(bffRequests.length).toBe(afterFirstDetail);
  });
});
