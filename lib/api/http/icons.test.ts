import { describe, expect, it } from "vitest";
import type { BffIconDto } from "@/app/api/bff/icons/_contract";
import type { IconFormValues } from "@/lib/validation/icon.schema";
import { toEntity, toPayload } from "./icons";

/**
 * Migration 0024 regression proof, admin side: history/saintImageDescription/
 * materials/dimensions previously round-tripped through this exact module as
 * hardcoded `undefined` (toEntity) and were never sent at all (toPayload) --
 * the admin form had inputs for them, but anything typed in was silently
 * discarded on save because nothing here forwarded them past the BFF
 * contract. Locks in that both directions now actually carry the fields.
 */
function bffIcon(overrides: Partial<BffIconDto> = {}): BffIconDto {
  return {
    id: "icon-1",
    title: "Ікона Св. Миколая",
    slug: "svt-mykolaia",
    imageUrl: "",
    galleryUrls: [],
    description: "Опис",
    language: "uk",
    translationGroupId: "group-1",
    status: "draft",
    calendarDayId: null,
    history: null,
    saintImageDescription: null,
    materials: null,
    dimensions: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function formValues(overrides: Partial<IconFormValues> = {}): IconFormValues {
  return {
    title: "Ікона Св. Миколая",
    slug: "svt-mykolaia",
    language: "uk",
    description: "Опис",
    mainImageId: undefined,
    galleryImageIds: [],
    relatedPrayerIds: [],
    relatedArticleIds: [],
    calendarDayId: undefined,
    status: "draft",
    ...overrides,
  };
}

describe("icons http adapter -- history/saintImageDescription/materials/dimensions round-trip", () => {
  it("toEntity reads all four fields from the BFF DTO instead of hardcoding undefined", () => {
    const entity = toEntity(
      bffIcon({
        history: "Ікону написано у XIX столітті.",
        saintImageDescription: "Свята зображена з хрестом.",
        materials: "Дерево, левкас, темпера",
        dimensions: "30x40 см",
      }),
    );
    expect(entity.history).toBe("Ікону написано у XIX столітті.");
    expect(entity.saintImageDescription).toBe("Свята зображена з хрестом.");
    expect(entity.materials).toBe("Дерево, левкас, темпера");
    expect(entity.dimensions).toBe("30x40 см");
  });

  it("toEntity maps a null DTO field to undefined, not the literal string 'null'", () => {
    const entity = toEntity(bffIcon({ history: null }));
    expect(entity.history).toBeUndefined();
  });

  it("toPayload sends all four fields instead of dropping them silently", () => {
    const payload = toPayload(
      formValues({
        history: "Історія",
        saintImageDescription: "Опис образу",
        materials: "Матеріали",
        dimensions: "Розміри",
      }),
    );
    expect(payload.history).toBe("Історія");
    expect(payload.saintImageDescription).toBe("Опис образу");
    expect(payload.materials).toBe("Матеріали");
    expect(payload.dimensions).toBe("Розміри");
  });

  it("toPayload sends null (not undefined/omitted) when a field is empty, so clearing it actually clears it", () => {
    const payload = toPayload(formValues({ history: undefined }));
    expect(payload.history).toBeNull();
  });
});
