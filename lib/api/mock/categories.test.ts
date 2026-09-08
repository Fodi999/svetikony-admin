import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/types/api";
import { categoriesResource } from "./categories";

describe("categoriesResource (mock adapter)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("creates, retrieves, updates and deletes a category", async () => {
    const created = await categoriesResource.create({
      slug: "testova-katehoriya",
      order: 99,
      active: true,
      translations: {
        uk: { name: "Тестова категорія", description: "" },
        ru: { name: "", description: "" },
        en: { name: "", description: "" },
      },
    });
    expect(created.id).toBeTruthy();

    const fetched = await categoriesResource.get(created.id);
    expect(fetched.name).toBe("Тестова категорія");

    const updated = await categoriesResource.update(created.id, {
      slug: "testova-katehoriya",
      order: 99,
      active: false,
      translations: {
        uk: { name: "Оновлена назва", description: "" },
        ru: { name: "", description: "" },
        en: { name: "", description: "" },
      },
    });
    expect(updated.name).toBe("Оновлена назва");
    expect(updated.active).toBe(false);

    await categoriesResource.remove(created.id);
    await expect(categoriesResource.get(created.id)).rejects.toThrow(ApiError);
  });

  it("rejects creating a category with a slug that already exists (409 conflict)", async () => {
    await categoriesResource.create({
      slug: "unique-slug-conflict-test",
      order: 0,
      active: true,
      translations: {
        uk: { name: "Ікони", description: "" },
        ru: { name: "", description: "" },
        en: { name: "", description: "" },
      },
    });

    await expect(
      categoriesResource.create({
        slug: "unique-slug-conflict-test",
        order: 1,
        active: true,
        translations: {
          uk: { name: "Інша категорія", description: "" },
          ru: { name: "", description: "" },
          en: { name: "", description: "" },
        },
      }),
    ).rejects.toMatchObject({ code: "conflict", status: 409 });
  });

  it("throws not_found for a missing id", async () => {
    await expect(categoriesResource.get("does-not-exist")).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
});
