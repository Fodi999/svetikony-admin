import { describe, expect, it } from "vitest";
import { toBffPrayerDto, toBffPrayerDtoList, type WorkerPrayerDto } from "./_contract";

function workerDto(overrides: Partial<WorkerPrayerDto> = {}): WorkerPrayerDto {
  return {
    id: "prayer-1",
    siteId: "site-1",
    iconId: null,
    calendarDayId: null,
    slug: "otche-nash",
    title: "Отче наш",
    text: "text",
    audioUrl: "",
    qrCodeUrl: "",
    imageUrl: "",
    source: "",
    sourceUrl: "",
    note: "",
    language: "uk",
    prayerType: "prayer",
    translationGroupId: "group-1",
    status: "draft",
    isGlobal: false,
    visualizerEnabled: true,
    visualizerImageUrl: "",
    particleCountDesktop: 50000,
    particleCountMobile: 16000,
    particleSize: 3.5,
    particleColorMode: "silver_gold",
    backgroundColor: "#000000",
    audioReactivity: 0.5,
    sceneTimeline: { idle: 1, assemble: 2, reveal: 3, dissolve: 4 },
    subtitleCues: [{ t: 0, text: "hi" }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("toBffPrayerDto", () => {
  it("drops internal Worker-only fields (siteId, isGlobal)", () => {
    const bff = toBffPrayerDto(workerDto());
    expect(bff).not.toHaveProperty("siteId");
    expect(bff).not.toHaveProperty("isGlobal");
  });

  /** PHASE MULTILINGUAL-3: unlike siteId/isGlobal, translationGroupId is
   * now KEPT -- the Worker always had a real, correctly-auto-linked value
   * here, and Prayer now extends Translatable so the admin's
   * TranslationSwitcher can use it, same as Icons/Saints/Calendar. */
  it("keeps translationGroupId -- Prayer is Translatable now", () => {
    const bff = toBffPrayerDto(workerDto());
    expect(bff).toHaveProperty("translationGroupId");
  });

  it("keeps every field the admin entity mapper needs", () => {
    const bff = toBffPrayerDto(workerDto());
    expect(bff).toMatchObject({
      id: "prayer-1",
      slug: "otche-nash",
      title: "Отче наш",
      language: "uk",
      translationGroupId: workerDto().translationGroupId,
      prayerType: "prayer",
      status: "draft",
      particleColorMode: "silver_gold",
    });
  });

  it("passes sceneTimeline/subtitleCues through unvalidated (validation happens in lib/api/http/prayers.ts)", () => {
    const bff = toBffPrayerDto(workerDto());
    expect(bff.sceneTimeline).toEqual({ idle: 1, assemble: 2, reveal: 3, dissolve: 4 });
    expect(bff.subtitleCues).toEqual([{ t: 0, text: "hi" }]);
  });
});

describe("toBffPrayerDtoList", () => {
  it("maps every item in the list", () => {
    const list = toBffPrayerDtoList([workerDto({ id: "a" }), workerDto({ id: "b" })]);
    expect(list.map((p) => p.id)).toEqual(["a", "b"]);
    for (const item of list) expect(item).not.toHaveProperty("siteId");
  });
});
