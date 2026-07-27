import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/types/api";
import { categoriesResource } from "./categories";

describe("categoriesResource (mock adapter)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("creates, retrieves, updates and deletes a category", async () => {
    const created = await categoriesResource.create({
      name: "Тестова категорія",
      slug: "testova-katehoriya",
      description: "",
      order: 99,
      active: true,
    });
    expect(created.id).toBeTruthy();

    const fetched = await categoriesResource.get(created.id);
    expect(fetched.name).toBe("Тестова категорія");

    const updated = await categoriesResource.update(created.id, {
      name: "Оновлена назва",
      slug: "testova-katehoriya",
      description: "",
      order: 99,
      active: false,
    });
    expect(updated.name).toBe("Оновлена назва");
    expect(updated.active).toBe(false);

    await categoriesResource.remove(created.id);
    await expect(categoriesResource.get(created.id)).rejects.toThrow(ApiError);
  });

  it("rejects creating a category with a slug that already exists (409 conflict)", async () => {
    await categoriesResource.create({
      name: "Ікони",
      slug: "unique-slug-conflict-test",
      description: "",
      order: 0,
      active: true,
    });

    await expect(
      categoriesResource.create({
        name: "Інша категорія",
        slug: "unique-slug-conflict-test",
        description: "",
        order: 1,
        active: true,
      }),
    ).rejects.toMatchObject({ code: "conflict", status: 409 });
  });

  it("throws not_found for a missing id", async () => {
    await expect(categoriesResource.get("does-not-exist")).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
});
