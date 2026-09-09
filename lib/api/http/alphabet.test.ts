import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/types/api";
import type { AlphabetLetterFormValues } from "@/lib/validation/alphabet.schema";
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
    audioUrl: "",
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
        letter: "А",
        name: "Азъ",
        pronunciation: undefined,
        description: "I, beginning, person",
        historicalNote: "Full historical note text.",
        numericValue: 1,
        mainImageId: undefined,
        audioUrl: undefined,
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

    it("maps a non-empty mainImageUrl/audioUrl through to mainImageId/audioUrl", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(dto({ mainImageUrl: "media/alphabet/x/main/uuid.jpg", audioUrl: "https://svetikony.com/media/alphabet/x/audio/uuid.mp3" })),
        ),
      );
      const letter = await alphabetLettersHttpResource.get("letter-1");
      expect(letter.mainImageId).toBe("media/alphabet/x/main/uuid.jpg");
      expect(letter.audioUrl).toBe("https://svetikony.com/media/alphabet/x/audio/uuid.mp3");
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

  describe("write operations (real backend, unblocked from the Stage 2 READ-only stub)", () => {
    const formValues: AlphabetLetterFormValues = {
      slug: "az",
      language: "en",
      order: 1,
      letter: "А",
      name: "Az",
      mainImageId: "media/alphabet/draft/main/uuid.jpg",
      audioUrl: "https://svetikony.com/media/alphabet/draft/audio/uuid.mp3",
    };

    it("create POSTs the mapped payload to the BFF and returns the created AlphabetLetter", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto({ name: "Az" }), 201));
      vi.stubGlobal("fetch", fetchMock);

      const letter = await alphabetLettersHttpResource.create(formValues);

      expect(letter.name).toBe("Az");
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/alphabet", expect.objectContaining({ method: "POST" }));
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({
        slug: "az",
        letter: "А",
        name: "Az",
        mainImageUrl: "media/alphabet/draft/main/uuid.jpg",
        audioUrl: "https://svetikony.com/media/alphabet/draft/audio/uuid.mp3",
      });
    });

    it("update PUTs the mapped payload to the BFF single-letter route", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto()));
      vi.stubGlobal("fetch", fetchMock);

      await alphabetLettersHttpResource.update("letter-1", formValues);

      expect(fetchMock).toHaveBeenCalledWith("/api/bff/alphabet/letter-1", expect.objectContaining({ method: "PUT" }));
    });

    it("remove DELETEs the BFF single-letter route", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal("fetch", fetchMock);

      await alphabetLettersHttpResource.remove("letter-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/bff/alphabet/letter-1", expect.objectContaining({ method: "DELETE" }));
    });

    it("propagates a validation_error ApiError from create on a 400 (e.g. missing letter)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "VALIDATION_ERROR" }, 400)));
      await expect(alphabetLettersHttpResource.create(formValues)).rejects.toMatchObject({ code: "validation_error" });
    });

    it("createTranslation POSTs the mapped payload with the target language, to the same plain create endpoint (Worker auto-links by slug)", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto({ language: "ru", translationGroupId: "group-1" }), 201));
      vi.stubGlobal("fetch", fetchMock);

      const letter = await alphabetLettersHttpResource.createTranslation?.("group-1", "ru", formValues);

      expect(letter?.translationGroupId).toBe("group-1");
      expect(letter?.language).toBe("ru");
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/alphabet", expect.objectContaining({ method: "POST" }));
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({ language: "ru" });
    });

    it("reorderGroups still throws a controlled not_implemented ApiError (no drag-and-drop UI wired up yet)", async () => {
      await expect(alphabetLettersHttpResource.reorderGroups(["group-1"])).rejects.toBeInstanceOf(ApiError);
    });
  });
});
