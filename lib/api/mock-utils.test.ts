import { describe, expect, it } from "vitest";
import { ApiError } from "@/types/api";
import { ensureUniqueSlug, matchesSearch, paginate } from "./mock-utils";

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it("returns the first page by default", () => {
    const result = paginate(items);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.items).toHaveLength(20);
    expect(result.total).toBe(25);
  });

  it("returns the requested page and page size", () => {
    const result = paginate(items, { page: 2, pageSize: 10 });
    expect(result.items).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(result.total).toBe(25);
  });
});

describe("matchesSearch", () => {
  it("returns true when search is empty or undefined", () => {
    expect(matchesSearch(["Молитва"], undefined)).toBe(true);
    expect(matchesSearch(["Молитва"], "")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(matchesSearch(["Отче наш"], "ОТЧЕ")).toBe(true);
  });

  it("returns false when no haystack contains the needle", () => {
    expect(matchesSearch(["Отче наш"], "Богородице")).toBe(false);
  });

  it("ignores undefined haystack entries", () => {
    expect(matchesSearch([undefined, "Молитва"], "молит")).toBe(true);
  });
});

describe("ensureUniqueSlug", () => {
  const items = [
    { id: "1", slug: "otche-nash", language: "uk" },
    { id: "2", slug: "otche-nash", language: "ru" },
  ];

  it("throws a 409 ApiError when the slug is already used for that language", () => {
    expect(() => ensureUniqueSlug({ items, slug: "otche-nash", language: "uk" })).toThrow(ApiError);
  });

  it("allows the same slug for a different language", () => {
    expect(() => ensureUniqueSlug({ items, slug: "otche-nash", language: "en" })).not.toThrow();
  });

  it("allows keeping its own slug when excludeId matches", () => {
    expect(() => ensureUniqueSlug({ items, slug: "otche-nash", language: "uk", excludeId: "1" })).not.toThrow();
  });

  it("reports conflict code and field error path on the thrown ApiError", () => {
    try {
      ensureUniqueSlug({ items, slug: "otche-nash", language: "uk" });
      throw new Error("expected ensureUniqueSlug to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.code).toBe("conflict");
      expect(apiError.status).toBe(409);
      expect(apiError.fieldErrors?.[0]?.path).toBe("slug");
    }
  });
});
