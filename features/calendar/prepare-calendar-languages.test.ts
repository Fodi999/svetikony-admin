import { beforeEach, expect, it, vi } from "vitest";
import { prepareCalendarLanguages } from "./prepare-calendar-languages";
const m = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), translate: vi.fn(), image: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: { calendarDays: { list: m.list, create: m.create, createTranslation: m.translate, generateImage: m.image } } }));
vi.mock("@/lib/api/http/transport", () => ({ httpPost: m.post }));
const day = (language: string, extra = {}) => ({ id: language, language, date: "2026-10-01", translationGroupId: "group", slug: "calendar-2026-10-01", status: "draft", ...extra });
beforeEach(() => {
  vi.clearAllMocks(); m.list.mockResolvedValue({ items: [] });
  m.create.mockImplementation(async (v) => day(v.language));
  m.translate.mockImplementation(async (_g, l) => day(l));
  m.image.mockResolvedValue({ mode: "direct", day: day("uk", { imageId: "/media/common.png" }) });
  m.post.mockImplementation(async (url, body) => url.endsWith("prepare-date") ? { date: body.date, language: body.language, title: "Title", slug: "calendar-2026-10-01", shortDescription: "Description", history: "History", eventType: "liturgical", status: "published", sourceUrl: "https://www.oca.org/" } : {});
});
it("creates three linked drafts and generates exactly one image", async () => {
  expect(await prepareCalendarLanguages("2026-10-01", "ru", undefined, vi.fn())).toBe("ru");
  expect(m.create).toHaveBeenCalledTimes(1); expect(m.translate).toHaveBeenCalledTimes(2); expect(m.image).toHaveBeenCalledTimes(1);
  expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ status: "draft", language: "uk" }));
  expect(m.translate).toHaveBeenCalledWith("group", "en", expect.objectContaining({ status: "draft", language: "en" }));
  expect(m.post).toHaveBeenCalledWith("/api/bff/calendar-days/ru/share-image", { sourceId: "uk" });
  expect(m.post).toHaveBeenCalledWith("/api/bff/calendar-days/en/share-image", { sourceId: "uk" });
});
it("preserves existing UK content and photo while adding RU/EN", async () => {
  m.list.mockResolvedValue({ items: [day("uk", { status: "published", imageId: "/media/existing.png" })] });
  await prepareCalendarLanguages("2026-10-01", "ru", "group", vi.fn());
  expect(m.create).not.toHaveBeenCalled(); expect(m.image).not.toHaveBeenCalled(); expect(m.translate).toHaveBeenCalledTimes(2);
});
it("resumes only the missing language", async () => {
  m.list.mockResolvedValue({ items: [day("uk", { imageId: "/media/common.png" }), day("ru", { imageId: "/media/common.png" })] });
  await prepareCalendarLanguages("2026-10-01", "en", "group", vi.fn());
  expect(m.translate).toHaveBeenCalledTimes(1); expect(m.image).not.toHaveBeenCalled();
});
it("does not regenerate texts after an image failure", async () => {
  m.list.mockResolvedValue({ items: [day("uk"), day("ru"), day("en")] });
  m.image.mockRejectedValue(new Error("quota"));
  await expect(prepareCalendarLanguages("2026-10-01", "uk", "group", vi.fn())).rejects.toThrow("Тексти UK/RU/EN збережено");
  expect(m.post).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled(); expect(m.translate).not.toHaveBeenCalled();
});
it("does not alter published translations or overwrite existing images", async () => {
  m.list.mockResolvedValue({ items: [day("uk", { imageId: "/media/a.png" }), day("ru", { status: "published" }), day("en", { imageId: "/media/b.png" })] });
  await prepareCalendarLanguages("2026-10-01", "uk", "group", vi.fn());
  expect(m.post).not.toHaveBeenCalled(); expect(m.image).not.toHaveBeenCalled();
});
