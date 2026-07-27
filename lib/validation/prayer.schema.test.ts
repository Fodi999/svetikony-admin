import { describe, expect, it } from "vitest";
import { prayerSchema, subtitleCueSchema } from "./prayer.schema";

const validPrayer = {
  title: "Отче наш",
  slug: "otche-nash",
  text: "Отче наш, Ти що єси на небесах...",
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

describe("prayerSchema", () => {
  it("accepts a valid prayer", () => {
    const result = prayerSchema.safeParse(validPrayer);
    expect(result.success).toBe(true);
  });

  it("rejects a slug with uppercase or spaces", () => {
    const result = prayerSchema.safeParse({ ...validPrayer, slug: "Otche Nash" });
    expect(result.success).toBe(false);
  });

  it("rejects text shorter than 10 characters", () => {
    const result = prayerSchema.safeParse({ ...validPrayer, text: "коротко" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid HEX background color", () => {
    const result = prayerSchema.safeParse({ ...validPrayer, backgroundColor: "blue" });
    expect(result.success).toBe(false);
  });

  it("rejects audioReactivity outside 0..1", () => {
    const result = prayerSchema.safeParse({ ...validPrayer, audioReactivity: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe("subtitleCueSchema", () => {
  it("accepts a cue where endMs is after startMs", () => {
    const result = subtitleCueSchema.safeParse({ id: "cue-1", startMs: 0, endMs: 2000, text: "Привіт" });
    expect(result.success).toBe(true);
  });

  it("rejects a cue where endMs is before startMs", () => {
    const result = subtitleCueSchema.safeParse({ id: "cue-1", startMs: 2000, endMs: 500, text: "Привіт" });
    expect(result.success).toBe(false);
  });
});
