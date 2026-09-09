import { afterEach, describe, expect, it, vi } from "vitest";
import type { VisualizerEventFormValues } from "@/lib/validation/visualizer-event.schema";
import { visualizerEventsHttpResource } from "./visualizer-events";

function dto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "event-1",
    slug: "khreshchennya-rusi",
    language: "uk",
    translationGroupId: "group-1",
    title: "Хрещення Русі",
    summary: "summary",
    description: "description",
    eventType: "historical",
    chronologyType: "exact",
    era: "medieval",
    calendarEra: "AD",
    yearStart: 988,
    yearEnd: null,
    century: 10,
    displayDate: "988",
    locationName: "Київ",
    latitude: 50.45,
    longitude: 30.52,
    calendarDayId: null,
    status: "published",
    isFeatured: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    publishedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("visualizerEventsHttpResource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("get", () => {
    it("maps a DTO to a VisualizerEvent entity", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto())));
      const event = await visualizerEventsHttpResource.get("event-1");
      expect(event).toMatchObject({
        id: "event-1",
        translationGroupId: "group-1",
        language: "uk",
        slug: "khreshchennya-rusi",
        title: "Хрещення Русі",
        eventType: "historical",
        chronologyType: "exact",
        yearStart: 988,
        status: "published",
        isFeatured: false,
      });
    });

    it("falls back to a safe status when the Worker value isn't one of admin's known values", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto({ status: "weird-legacy-value" }))));
      const event = await visualizerEventsHttpResource.get("event-1");
      expect(event.status).toBe("draft");
    });

    it("maps null yearStart/century and empty strings to undefined", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(dto({ yearStart: null, century: null, summary: "", description: "", displayDate: "" }))),
      );
      const event = await visualizerEventsHttpResource.get("event-1");
      expect(event.yearStart).toBeUndefined();
      expect(event.century).toBeUndefined();
      expect(event.summary).toBeUndefined();
      expect(event.description).toBeUndefined();
      expect(event.displayDate).toBeUndefined();
    });

    it("propagates a not_found ApiError for a 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "NOT_FOUND" }, 404)));
      await expect(visualizerEventsHttpResource.get("missing")).rejects.toMatchObject({ code: "not_found" });
    });
  });

  describe("list", () => {
    const events = [
      dto({ id: "b", slug: "b", title: "B", yearStart: 1200 }),
      dto({ id: "a", slug: "a", title: "A", yearStart: 988 }),
      dto({ id: "c", slug: "c", title: "C", yearStart: 33 }),
    ];

    it("sorts client-side by yearStart", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(events)));
      const result = await visualizerEventsHttpResource.list();
      expect(result.items.map((e) => e.slug)).toEqual(["c", "a", "b"]);
    });

    it("forwards the language and status filters to the backend as query params", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(events));
      vi.stubGlobal("fetch", fetchMock);
      await visualizerEventsHttpResource.list({ language: "uk", status: "published" });
      const [url] = fetchMock.mock.calls[0];
      expect(String(url)).toContain("language=uk");
      expect(String(url)).toContain("status=published");
    });

    it("propagates a network_error ApiError when fetch fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
      await expect(visualizerEventsHttpResource.list()).rejects.toMatchObject({ code: "network_error" });
    });
  });

  describe("write operations", () => {
    const formValues: VisualizerEventFormValues = {
      slug: "khreshchennya-rusi",
      language: "uk",
      title: "Хрещення Русі",
      eventType: "historical",
      chronologyType: "exact",
      era: "medieval",
      calendarEra: "AD",
      yearStart: 988,
      status: "published",
      isFeatured: false,
    };

    it("create POSTs the mapped payload to the BFF and returns the created VisualizerEvent", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto(), 201));
      vi.stubGlobal("fetch", fetchMock);
      const event = await visualizerEventsHttpResource.create(formValues);
      expect(event.title).toBe("Хрещення Русі");
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/visualizer-events", expect.objectContaining({ method: "POST" }));
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({ slug: "khreshchennya-rusi", title: "Хрещення Русі", yearStart: 988 });
      expect(body).not.toHaveProperty("sortYear");
    });

    it("update PUTs the mapped payload to the BFF single-event route", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto()));
      vi.stubGlobal("fetch", fetchMock);
      await visualizerEventsHttpResource.update("event-1", formValues);
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/visualizer-events/event-1", expect.objectContaining({ method: "PUT" }));
    });

    it("remove DELETEs the BFF single-event route", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal("fetch", fetchMock);
      await visualizerEventsHttpResource.remove("event-1");
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/visualizer-events/event-1", expect.objectContaining({ method: "DELETE" }));
    });

    it("createTranslation POSTs the mapped payload with the target language, to the same plain create endpoint (Worker auto-links by slug)", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto({ language: "ru", translationGroupId: "group-1" }), 201));
      vi.stubGlobal("fetch", fetchMock);
      const event = await visualizerEventsHttpResource.createTranslation?.("group-1", "ru", formValues);
      expect(event?.translationGroupId).toBe("group-1");
      expect(event?.language).toBe("ru");
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({ language: "ru" });
    });
  });
});
