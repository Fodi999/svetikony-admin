import { describe, expect, it } from "vitest";
import { toBffVisualizerEventDto, toBffVisualizerEventDtoList, type WorkerVisualizerEventDto } from "./_contract";

function workerDto(overrides: Partial<WorkerVisualizerEventDto> = {}): WorkerVisualizerEventDto {
  return {
    id: "event-1",
    siteId: "site-1",
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
    sortYear: 988,
    locationName: "Київ",
    latitude: 50.45,
    longitude: 30.52,
    calendarDayId: null,
    status: "published",
    isFeatured: false,
    isGlobal: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    publishedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toBffVisualizerEventDto", () => {
  it("drops internal Worker-only fields (siteId, isGlobal)", () => {
    const bff = toBffVisualizerEventDto(workerDto());
    for (const field of ["siteId", "isGlobal"]) {
      expect(bff).not.toHaveProperty(field);
    }
  });

  it("keeps every field the admin entity mapper needs", () => {
    const bff = toBffVisualizerEventDto(workerDto());
    expect(bff).toEqual({
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
      sortYear: 988,
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
    });
  });
});

describe("toBffVisualizerEventDtoList", () => {
  it("maps every item and drops internal fields on each", () => {
    const list = toBffVisualizerEventDtoList([workerDto({ id: "a" }), workerDto({ id: "b" })]);
    expect(list.map((e) => e.id)).toEqual(["a", "b"]);
    for (const item of list) expect(item).not.toHaveProperty("siteId");
  });
});
