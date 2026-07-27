import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Дмитро Адміністратор/ }).click();
  await page.getByRole("button", { name: "Увійти" }).click();
  await page.waitForURL("/");
});

test.describe("Responsive shell", () => {
  test("shows the desktop sidebar with content sections", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Молитви" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Азбука" })).toBeVisible();
  });

  test("shows the mobile bottom navigation with a working More sheet", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Ще" })).toBeVisible();

    await page.getByRole("button", { name: "Ще" }).click();
    await expect(page.getByRole("heading", { name: "Усі розділи" })).toBeVisible();
    await page.getByRole("link", { name: "Молитви" }).click();
    await page.waitForURL(/\/prayers/);
  });

  test("toggles between light and dark theme", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await page.getByRole("button", { name: "Перемкнути тему" }).click();
    await expect(html).toHaveClass(/dark|light/);
  });
});
