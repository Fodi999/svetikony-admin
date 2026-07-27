import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated visitors to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/);
    await expect(page.getByText("Вхід у систему")).toBeVisible();
  });

  test("logs in with a quick-select test account and reaches the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Дмитро Адміністратор/ }).click();
    await page.getByRole("button", { name: "Увійти" }).click();
    await page.waitForURL("/");
    await expect(page.getByRole("heading", { name: /Вітаємо/ })).toBeVisible();
  });

  test("rejects an invalid password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@svetikony.com");
    await page.getByLabel("Пароль").fill("wrong-password");
    await page.getByRole("button", { name: "Увійти" }).click();
    await expect(page.getByText("Невірний email або пароль")).toBeVisible();
  });

  test("logs out back to the login screen", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Дмитро Адміністратор/ }).click();
    await page.getByRole("button", { name: "Увійти" }).click();
    await page.waitForURL("/");

    await page.getByRole("button", { name: /Дмитро Адміністратор/ }).click();
    await page.getByRole("menuitem", { name: "Вийти" }).click();
    await page.waitForURL(/\/login/);
  });
});
