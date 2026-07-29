import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

const workerLetter = {
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
};

describe("GET /api/bff/alphabet", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    process.env.SVET_IKONY_API_BASE_URL = "http://localhost:3001";
    process.env.SVET_IKONY_ADMIN_TOKEN = "test-secret-jwt-value";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    vi.unstubAllGlobals();
  });

  it("never returns internal Worker fields after the Stage 2C retrofit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify([workerLetter]), { status: 200, headers: { "content-type": "application/json" } })),
    );
    const response = await GET(new NextRequest("http://localhost/api/bff/alphabet"));
    const bodyText = await response.text();
    for (const field of ["siteId", "letter\"", "modernEquivalent", "color\"", "cardImageUrl", "mainImageUrl", "seoTitle", "seoDescription", "isGlobal"]) {
      expect(bodyText).not.toContain(field);
    }
    const body = JSON.parse(bodyText);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("letter-1");
    expect(body[0].name).toBe("Азъ");
  });
});
