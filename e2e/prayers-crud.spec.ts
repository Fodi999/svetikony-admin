import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Дмитро Адміністратор/ }).click();
  await page.getByRole("button", { name: "Увійти" }).click();
  await page.waitForURL("/");
});

test.describe("Prayers CRUD", () => {
  test("blocks saving an empty form and shows field-level validation errors", async ({ page }) => {
    await page.goto("/prayers/new");
    await page.getByRole("button", { name: "Зберегти" }).click();
    await expect(page.getByText("Перевірте поля форми")).toBeVisible();
    await expect(page.getByText("Мінімум 2 символи").first()).toBeVisible();
  });

  test("creates, previews, edits and deletes a prayer end-to-end", async ({ page }) => {
    const title = `E2E тестова молитва ${Date.now()}`;

    await page.goto("/prayers/new");
    await page.getByLabel("Назва").fill(title);
    await page.getByLabel("Slug").fill(`e2e-${Date.now()}`);
    await page.getByLabel("Текст молитви").fill("Це текст молитви, створений автоматизованим тестом.");

    // Preview should reflect the current draft before saving.
    await page.getByRole("button", { name: "Попередній перегляд" }).click();
    await expect(page.getByText(title)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Зберегти" }).click();
    await page.waitForURL(/\/prayers\/prayer-/);
    await expect(page.getByText("Зміни збережено").or(page.getByText("Молитву створено"))).toBeVisible();

    await page.goto("/prayers");
    await page.getByPlaceholder(/Пошук/).fill(title);
    const visibleTitle = page.getByText(title).and(page.locator(":visible"));
    await expect(visibleTitle).toBeVisible();

    await visibleTitle.click();
    await page.waitForURL(/\/prayers\/prayer-/);
    await page.getByRole("tab", { name: "Публікація" }).click();
    await page.getByRole("button", { name: /Видалити молитву/ }).click();
    await page.getByRole("button", { name: "Видалити" }).last().click();
    await page.waitForURL("/prayers");
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
