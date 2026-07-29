import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/types/api";
import { alphabetLettersHttpResource } from "./alphabet";

function dto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "letter-1",
    siteId: "site-1",
    slug: "az",
    letter: "А",
    sortOrder: 1,
    name: "Азъ",
    shortDescription: "I, beginning, person",
    fullText: "Full historical note text.",
    numericValue: 1,
    modernEquivalent: "А",
    color: "#9a2b1e",
    cardImageUrl: "",
    mainImageUrl: "",
    seoTitle: "",
    seoDescription: "",
    language: "en",
    translationGroupId: "group-1",
    status: "published",
    isGlobal: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("alphabetLettersHttpResource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("get", () => {
    it("maps a DTO to an AlphabetLetter entity", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto())));
      const letter = await alphabetLettersHttpResource.get("letter-1");
      expect(letter).toEqual({
        id: "letter-1",
        translationGroupId: "group-1",
        language: "en",
        slug: "az",
        order: 1,
        name: "Азъ",
        pronunciation: undefined,
        description: "I, beginning, person",
        historicalNote: "Full historical note text.",
        numericValue: 1,
        mainImageId: undefined,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      });
    });

    it("maps null numericValue and empty strings to undefined", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(dto({ numericValue: null, shortDescription: "", fullText: "" }))),
      );
      const letter = await alphabetLettersHttpResource.get("letter-1");
      expect(letter.numericValue).toBeUndefined();
      expect(letter.description).toBeUndefined();
      expect(letter.historicalNote).toBeUndefined();
    });

    it("requests the BFF single-letter route with the encoded id", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto()));
      vi.stubGlobal("fetch", fetchMock);
      await alphabetLettersHttpResource.get("letter with space");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bff/alphabet/letter%20with%20space",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("propagates a not_found ApiError for a 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "NOT_FOUND" }, 404)));
      await expect(alphabetLettersHttpResource.get("missing")).rejects.toMatchObject({ code: "not_found" });
    });

    it("propagates an unauthorized ApiError when the BFF reports a missing token", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ code: "AUTHENTICATION_ERROR", details: "no token configured" }, 401)),
      );
      await expect(alphabetLettersHttpResource.get("letter-1")).rejects.toMatchObject({ code: "unauthorized" });
    });
  });

  describe("list", () => {
    const letters = [
      dto({ id: "b", slug: "buky", name: "Букы", sortOrder: 2 }),
      dto({ id: "a", slug: "az", name: "Азъ", sortOrder: 1 }),
      dto({ id: "v", slug: "vedi", name: "Веди", sortOrder: 3 }),
    ];

    it("sorts client-side by order even when the backend returns unsorted data", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(letters)));
      const result = await alphabetLettersHttpResource.list();
      expect(result.items.map((l) => l.slug)).toEqual(["az", "buky", "vedi"]);
      expect(result.total).toBe(3);
    });

    it("filters client-side by search across name and slug", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(letters)));
      const result = await alphabetLettersHttpResource.list({ search: "buk" });
      expect(result.items.map((l) => l.slug)).toEqual(["buky"]);
    });

    it("paginates client-side using page and pageSize", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(letters)));
      const result = await alphabetLettersHttpResource.list({ page: 2, pageSize: 1 });
      expect(result.items.map((l) => l.slug)).toEqual(["buky"]);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(1);
      expect(result.total).toBe(3);
    });

    it("forwards the language filter to the backend as a query param", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(letters));
      vi.stubGlobal("fetch", fetchMock);
      await alphabetLettersHttpResource.list({ language: "uk" });
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/alphabet?language=uk", expect.objectContaining({ method: "GET" }));
    });

    it("propagates a server_error ApiError for a 500", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "INTERNAL_ERROR" }, 500)));
      await expect(alphabetLettersHttpResource.list()).rejects.toMatchObject({ code: "server_error" });
    });

    it("propagates a network_error ApiError when fetch fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
      await expect(alphabetLettersHttpResource.list()).rejects.toMatchObject({ code: "network_error" });
    });
  });

  describe("write operations (READ-only Stage 2)", () => {
    it("create throws a controlled not_implemented ApiError without calling fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await expect(
        alphabetLettersHttpResource.create({
          slug: "az",
          language: "en",
          order: 1,
          name: "Az",
        }),
      ).rejects.toMatchObject({ code: "not_implemented" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("update throws a controlled not_implemented ApiError", async () => {
      await expect(
        alphabetLettersHttpResource.update("letter-1", { slug: "az", language: "en", order: 1, name: "Az" }),
      ).rejects.toBeInstanceOf(ApiError);
    });

    it("remove throws a controlled not_implemented ApiError", async () => {
      await expect(alphabetLettersHttpResource.remove("letter-1")).rejects.toMatchObject({ code: "not_implemented" });
    });

    it("reorderGroups throws a controlled not_implemented ApiError", async () => {
      await expect(alphabetLettersHttpResource.reorderGroups(["group-1"])).rejects.toMatchObject({
        code: "not_implemented",
      });
    });
  });
});
