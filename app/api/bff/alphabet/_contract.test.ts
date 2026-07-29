import { describe, expect, it } from "vitest";
import { toBffAlphabetLetterDto, toBffAlphabetLetterDtoList, type WorkerAlphabetLetterDto } from "./_contract";

function workerDto(overrides: Partial<WorkerAlphabetLetterDto> = {}): WorkerAlphabetLetterDto {
  return {
    id: "letter-1",
    siteId: "site-1",
    slug: "az",
    letter: "А",
    sortOrder: 1,
    name: "Азъ",
    shortDescription: "desc",
    fullText: "full text",
    numericValue: 1,
    modernEquivalent: "А",
    color: "#9a2b1e",
    cardImageUrl: "https://example.com/card.png",
    mainImageUrl: "https://example.com/main.png",
    seoTitle: "seo title",
    seoDescription: "seo description",
    language: "en",
    translationGroupId: "group-1",
    status: "published",
    isGlobal: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("toBffAlphabetLetterDto", () => {
  it("drops every internal Worker-only field", () => {
    const bff = toBffAlphabetLetterDto(workerDto());
    for (const field of [
      "siteId",
      "letter",
      "modernEquivalent",
      "color",
      "cardImageUrl",
      "mainImageUrl",
      "seoTitle",
      "seoDescription",
      "status",
      "isGlobal",
    ]) {
      expect(bff).not.toHaveProperty(field);
    }
  });

  it("keeps every field the admin entity mapper needs", () => {
    const bff = toBffAlphabetLetterDto(workerDto());
    expect(bff).toEqual({
      id: "letter-1",
      slug: "az",
      sortOrder: 1,
      name: "Азъ",
      shortDescription: "desc",
      fullText: "full text",
      numericValue: 1,
      language: "en",
      translationGroupId: "group-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });
});

describe("toBffAlphabetLetterDtoList", () => {
  it("maps every item and drops internal fields on each", () => {
    const list = toBffAlphabetLetterDtoList([workerDto({ id: "a" }), workerDto({ id: "b" })]);
    expect(list.map((l) => l.id)).toEqual(["a", "b"]);
    for (const item of list) expect(item).not.toHaveProperty("siteId");
  });
});
