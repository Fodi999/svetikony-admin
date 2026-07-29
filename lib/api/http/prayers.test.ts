import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/types/api";
import { prayersHttpResource } from "./prayers";

function dto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "prayer-1",
    iconId: null,
    calendarDayId: null,
    slug: "otche-nash",
    title: "Отче наш",
    text: "Отче наш, Ти що єси на небесах",
    audioUrl: "",
    qrCodeUrl: "",
    imageUrl: "",
    source: "",
    sourceUrl: "",
    note: "",
    language: "uk",
    prayerType: "general",
    status: "draft",
    visualizerEnabled: true,
    visualizerImageUrl: "",
    particleCountDesktop: 50000,
    particleCountMobile: 16000,
    particleSize: 3.5,
    particleColorMode: "theme",
    backgroundColor: "#000000",
    audioReactivity: 0.5,
    sceneTimeline: [{ id: "e1", atMs: 0, label: "start", intensity: 0.5 }],
    subtitleCues: [{ id: "c1", startMs: 0, endMs: 100, text: "hi" }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("prayersHttpResource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("get / mapping", () => {
    it("maps a well-formed DTO to a Prayer entity", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto())));
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer).toEqual({
        id: "prayer-1",
        title: "Отче наш",
        slug: "otche-nash",
        text: "Отче наш, Ти що єси на небесах",
        language: "uk",
        prayerType: "general",
        status: "draft",
        iconId: undefined,
        calendarDayId: undefined,
        audioUrl: undefined,
        qrCodeUrl: undefined,
        imageUrl: undefined,
        source: undefined,
        sourceUrl: undefined,
        note: undefined,
        visualizerEnabled: true,
        visualizerImageUrl: undefined,
        particleCountDesktop: 50000,
        particleCountMobile: 16000,
        particleSize: 3.5,
        particleColorMode: "theme",
        backgroundColor: "#000000",
        audioReactivity: 0.5,
        sceneTimeline: [{ id: "e1", atMs: 0, label: "start", intensity: 0.5 }],
        subtitleCues: [{ id: "c1", startMs: 0, endMs: 100, text: "hi" }],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      });
    });

    it("maps null iconId/calendarDayId and empty optional strings to undefined", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(dto({ iconId: null, calendarDayId: null, audioUrl: "", note: "", visualizerImageUrl: "" })),
        ),
      );
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.iconId).toBeUndefined();
      expect(prayer.calendarDayId).toBeUndefined();
      expect(prayer.audioUrl).toBeUndefined();
      expect(prayer.note).toBeUndefined();
      expect(prayer.visualizerImageUrl).toBeUndefined();
    });

    it("preserves a real iconId/calendarDayId when present", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto({ iconId: "icon-1", calendarDayId: "day-1" }))));
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.iconId).toBe("icon-1");
      expect(prayer.calendarDayId).toBe("day-1");
    });

    it("falls back to a safe prayerType when the Worker value isn't one of admin's known values (real local data has 'prayer')", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto({ prayerType: "prayer" }))));
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.prayerType).toBe("general");
    });

    it("keeps a valid prayerType unchanged", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto({ prayerType: "morning" }))));
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.prayerType).toBe("morning");
    });

    it("falls back to a safe particleColorMode when the Worker value isn't known (real local data has 'silver_gold')", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto({ particleColorMode: "silver_gold" }))));
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.particleColorMode).toBe("single");
    });

    it("falls back to a safe status when the Worker value isn't known", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto({ status: "something_else" }))));
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.status).toBe("draft");
    });

    it("falls back to a safe language when the Worker value isn't known", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto({ language: "fr" }))));
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.language).toBe("uk");
    });

    it("drops sceneTimeline to [] when the Worker returns a timing-config object instead of an array (real local data shape)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(dto({ sceneTimeline: { idle: 1, assemble: 2, reveal: 3, dissolve: 4 } }))),
      );
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.sceneTimeline).toEqual([]);
    });

    it("drops subtitleCues to [] when items don't match the expected shape (real local data has {t,text}, not {id,startMs,endMs,text})", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto({ subtitleCues: [{ t: 0, text: "hi" }] }))));
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.subtitleCues).toEqual([]);
    });

    it("drops only the malformed items from sceneTimeline, keeping well-formed ones", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            dto({
              sceneTimeline: [
                { id: "ok", atMs: 0, label: "fine", intensity: 0.5 },
                { totally: "wrong shape" },
              ],
            }),
          ),
        ),
      );
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.sceneTimeline).toEqual([{ id: "ok", atMs: 0, label: "fine", intensity: 0.5 }]);
    });

    it("treats missing/undefined JSON fields as empty arrays without throwing", async () => {
      const withoutJsonFields = dto();
      delete (withoutJsonFields as Record<string, unknown>).sceneTimeline;
      delete (withoutJsonFields as Record<string, unknown>).subtitleCues;
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(withoutJsonFields)));
      const prayer = await prayersHttpResource.get("prayer-1");
      expect(prayer.sceneTimeline).toEqual([]);
      expect(prayer.subtitleCues).toEqual([]);
    });

    it("requests the BFF single-prayer route with the encoded id", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto()));
      vi.stubGlobal("fetch", fetchMock);
      await prayersHttpResource.get("prayer with space");
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/prayers/prayer%20with%20space", expect.objectContaining({ method: "GET" }));
    });
  });

  describe("list", () => {
    const prayers = [
      dto({ id: "b", slug: "b-prayer", title: "Богородице Діво" }),
      dto({ id: "a", slug: "a-prayer", title: "Аллилуйя" }),
      dto({ id: "v", slug: "v-prayer", title: "Вірую" }),
    ];

    it("sorts client-side by title", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(prayers)));
      const result = await prayersHttpResource.list();
      expect(result.items.map((p) => p.slug)).toEqual(["a-prayer", "b-prayer", "v-prayer"]);
      expect(result.total).toBe(3);
    });

    it("filters client-side by search across title/text/slug", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(prayers)));
      const result = await prayersHttpResource.list({ search: "богород" });
      expect(result.items.map((p) => p.slug)).toEqual(["b-prayer"]);
    });

    it("filters client-side by status (backend has no status filter support)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse([dto({ id: "d", status: "draft" }), dto({ id: "p", status: "published" })]),
        ),
      );
      const result = await prayersHttpResource.list({ status: "published" });
      expect(result.items.map((p) => p.id)).toEqual(["p"]);
    });

    it("paginates client-side using page and pageSize", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(prayers)));
      const result = await prayersHttpResource.list({ page: 2, pageSize: 1 });
      expect(result.items.map((p) => p.slug)).toEqual(["b-prayer"]);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(1);
      expect(result.total).toBe(3);
    });

    it("forwards the language filter to the backend as a query param", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(prayers));
      vi.stubGlobal("fetch", fetchMock);
      await prayersHttpResource.list({ language: "uk" });
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/prayers?language=uk", expect.objectContaining({ method: "GET" }));
    });

    it("propagates a not_found ApiError for a 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "NOT_FOUND" }, 404)));
      await expect(prayersHttpResource.get("missing")).rejects.toMatchObject({ code: "not_found" });
    });

    it("propagates an unauthorized ApiError for a 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "AUTHENTICATION_ERROR" }, 401)));
      await expect(prayersHttpResource.list()).rejects.toMatchObject({ code: "unauthorized" });
    });

    it("propagates a forbidden ApiError for a 403", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "AUTHORIZATION_ERROR" }, 403)));
      await expect(prayersHttpResource.list()).rejects.toMatchObject({ code: "forbidden" });
    });

    it("propagates a conflict ApiError for a 409", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "CONFLICT" }, 409)));
      await expect(prayersHttpResource.list()).rejects.toMatchObject({ code: "conflict" });
    });

    it("propagates a server_error ApiError for a 500", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "INTERNAL_ERROR" }, 500)));
      await expect(prayersHttpResource.list()).rejects.toMatchObject({ code: "server_error" });
    });

    it("propagates a network_error ApiError when fetch fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
      await expect(prayersHttpResource.list()).rejects.toMatchObject({ code: "network_error" });
    });

    it("propagates a network_error ApiError on timeout (abort)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new DOMException("aborted", "AbortError"))));
      await expect(prayersHttpResource.list()).rejects.toMatchObject({ code: "network_error" });
    });
  });

  describe("write operations (READ-only Stage 2C)", () => {
    const formValues = {
      title: "Отче наш",
      slug: "otche-nash",
      text: "Отче наш, Ти що єси на небесах",
      language: "uk" as const,
      prayerType: "general" as const,
      status: "draft" as const,
      visualizerEnabled: false,
      particleCountDesktop: 1200,
      particleCountMobile: 400,
      particleSize: 2,
      particleColorMode: "theme" as const,
      backgroundColor: "#0b1220",
      audioReactivity: 0.4,
      sceneTimeline: [],
      subtitleCues: [],
    };

    it("create throws a controlled not_implemented ApiError without calling fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await expect(prayersHttpResource.create(formValues)).rejects.toMatchObject({ code: "not_implemented" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("update throws a controlled not_implemented ApiError without calling fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await expect(prayersHttpResource.update("prayer-1", formValues)).rejects.toBeInstanceOf(ApiError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("remove throws a controlled not_implemented ApiError without calling fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await expect(prayersHttpResource.remove("prayer-1")).rejects.toMatchObject({ code: "not_implemented" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("createTranslation throws a controlled not_implemented ApiError without calling fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await expect(prayersHttpResource.createTranslation?.("group-1", "ru", formValues)).rejects.toMatchObject({
        code: "not_implemented",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
