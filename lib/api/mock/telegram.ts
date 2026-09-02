import type { TelegramApi } from "@/lib/api/client";
import { mockDelay } from "@/lib/api/mock-utils";
import type { AutopostSettingsFormValues, TelegramPostFormValues } from "@/lib/validation/telegram.schema";
import { ApiError } from "@/types/api";
import {
  AUTOPOST_CONTENT_TYPES,
  type AutopostContentType,
  type ContentPlanDay,
  type ContentPlanQuery,
  type ContentPlanReport,
  type ContentPlanSlot,
  type ContentPlanSummary,
  type PrepareDayReport,
  type TelegramAutopostSettings,
  type TelegramChat,
  type TelegramPost,
  type TelegramUser,
} from "@/types/entities";

let autopostSettings: TelegramAutopostSettings = {
  globalEnabled: false,
  items: [
    { contentType: "morning_prayer", enabled: true, scheduleTime: "07:00" },
    { contentType: "saint_of_day", enabled: true, scheduleTime: "10:00" },
    { contentType: "gospel", enabled: true, scheduleTime: "13:00" },
    { contentType: "faith_story", enabled: true, scheduleTime: "17:00" },
    { contentType: "evening_prayer", enabled: true, scheduleTime: "20:00" },
  ],
};

const mockUsers: TelegramUser[] = [
  {
    id: "1",
    telegramUserId: 1142224362,
    username: "fodi999",
    firstName: "Дмитро",
    lastName: null,
    languageCode: "uk",
    isBot: false,
    isActive: true,
    createdAt: "2026-08-30T10:32:34Z",
    updatedAt: "2026-08-30T10:32:34Z",
  },
];

const mockChats: TelegramChat[] = [
  {
    id: "1",
    telegramChatId: 1142224362,
    chatType: "private",
    title: null,
    username: "fodi999",
    isActive: true,
    createdAt: "2026-08-30T10:32:34Z",
    updatedAt: "2026-08-30T10:32:34Z",
  },
];

let posts: TelegramPost[] = [];
let nextPostId = 1;

/** Content Plan Stage 2's per-slot prepared rows -- kept as their own tiny
 * in-memory store (not mixed into `posts`) since they're addressed by
 * (date, contentType), not by id, until an action creates one. */
const preparedSlots = new Map<string, TelegramPost>();

function slotKey(date: string, contentType: AutopostContentType): string {
  return `${date}|${contentType}`;
}

function findOrCreateSlot(date: string, contentType: AutopostContentType): TelegramPost {
  const key = slotKey(date, contentType);
  const existing = preparedSlots.get(key);
  if (existing) return existing;
  const now = new Date().toISOString();
  const fresh: TelegramPost = {
    id: String(nextPostId++),
    sourceType: null,
    sourceId: null,
    text: null,
    mediaUrl: null,
    telegramMessageId: null,
    status: "draft",
    scheduledAt: null,
    sentAt: null,
    errorMessage: null,
    contentType,
    publishDate: date,
    verificationStatus: contentType === "saint_of_day" ? "verified" : null,
    verificationError: null,
    createdAt: now,
    updatedAt: now,
  };
  preparedSlots.set(key, fresh);
  return fresh;
}

function assertSlotMutable(post: TelegramPost): void {
  if (post.status === "sent" || post.status === "sending") {
    throw new ApiError("conflict", "Слот вже надіслано і більше не можна змінювати");
  }
}

function saveSlot(date: string, contentType: AutopostContentType, patch: Partial<TelegramPost>): TelegramPost {
  const current = findOrCreateSlot(date, contentType);
  const updated: TelegramPost = { ...current, ...patch, updatedAt: new Date().toISOString() };
  preparedSlots.set(slotKey(date, contentType), updated);
  return updated;
}

const SCHEDULE_TIMES: Record<AutopostContentType, string> = {
  morning_prayer: "07:00",
  saint_of_day: "10:00",
  gospel: "13:00",
  faith_story: "17:00",
  evening_prayer: "20:00",
};

/** Small synthetic dataset: only civil 2026-09-01..2026-09-30 has any
 * "real" content, mirroring this project's actual production D1 state at
 * the time this mock was written -- everything else is a virtual empty
 * day, exactly like the real backend reports for a day it has no row for.
 * A slot with a `preparedSlots` entry (Content Plan Stage 2 actions
 * exercised in mock/dev mode) overlays that state on top, so generate/
 * edit/mark-ready etc. are actually visible on refetch instead of always
 * resetting back to the synthetic default. */
function mockDay(civilDate: string): ContentPlanDay {
  const inRange = civilDate >= "2026-09-01" && civilDate <= "2026-09-30";
  const slots = {} as Record<AutopostContentType, ContentPlanSlot>;
  for (const contentType of AUTOPOST_CONTENT_TYPES) {
    const prepared = preparedSlots.get(slotKey(civilDate, contentType));
    slots[contentType] = prepared
      ? {
          contentType,
          scheduledTime: SCHEDULE_TIMES[contentType],
          sourceStatus: "available",
          verificationStatus: prepared.verificationStatus === "verified" || prepared.verificationStatus === "failed" ? prepared.verificationStatus : null,
          publicationStatus:
            prepared.status === "sent"
              ? "SENT"
              : prepared.status === "sending"
                ? "SENDING"
                : prepared.status === "ready"
                  ? "READY"
                  : "DRAFT",
          textAvailable: !!prepared.text?.trim(),
          imageAvailable: !!prepared.mediaUrl,
          sentAt: prepared.sentAt,
          telegramMessageId: prepared.telegramMessageId,
          errorMessage: prepared.errorMessage,
        }
      : {
          contentType,
          scheduledTime: SCHEDULE_TIMES[contentType],
          sourceStatus: inRange ? "available" : "missing_source",
          verificationStatus: inRange && contentType === "saint_of_day" ? "verified" : null,
          publicationStatus: inRange ? "SOURCE_READY" : "MISSING_SOURCE",
          textAvailable: inRange,
          imageAvailable: false,
          sentAt: null,
          telegramMessageId: null,
          errorMessage: null,
        };
  }
  return {
    civilDate,
    julianDate: civilDate,
    calendarTitle: inRange ? "Мок: святий дня" : null,
    calendarDayId: inRange ? "mock-calendar-day" : null,
    slots,
  };
}

function mockSummary(days: ContentPlanDay[]): ContentPlanSummary {
  const summary: ContentPlanSummary = {
    totalDays: days.length,
    sent: 0,
    ready: 0,
    draft: 0,
    sourceReady: 0,
    missingSource: 0,
    reviewRequired: 0,
    failed: 0,
    coverage: Object.fromEntries(AUTOPOST_CONTENT_TYPES.map((t) => [t, { available: 0, missing: 0 }])) as ContentPlanSummary["coverage"],
  };
  for (const day of days) {
    for (const slot of Object.values(day.slots)) {
      if (slot.publicationStatus === "SOURCE_READY") summary.sourceReady += 1;
      else if (slot.publicationStatus === "MISSING_SOURCE") summary.missingSource += 1;
      const bucket = summary.coverage[slot.contentType];
      if (slot.sourceStatus === "available") bucket.available += 1;
      else bucket.missing += 1;
    }
  }
  return summary;
}

export const telegramResource: TelegramApi = {
  async getStatus() {
    await mockDelay(200);
    return {
      configured: true,
      channel: "@svit_ikony",
      webhook: { url: "https://svetikony.com/api/telegram/webhook", pendingUpdateCount: 0, lastErrorMessage: null },
      stats: { userCount: mockUsers.length, chatCount: mockChats.length, lastActivityAt: mockUsers[0]?.updatedAt ?? null },
    };
  },
  async listUsers() {
    await mockDelay(200);
    return mockUsers;
  },
  async listChats() {
    await mockDelay(200);
    return mockChats;
  },
  async getToday() {
    await mockDelay(200);
    return {
      calendarDay: { id: "mock-day", title: "Преображення Господнє", description: "Свято на честь Преображення." },
      saint: { id: "mock-saint", name: "Прп. Максим Сповідник", shortDescription: "Богослов і подвижник VII століття." },
      prayer: { id: "mock-prayer", title: "Молитва до Преображення", text: "Господи, просвіти нас світлом Твоїм..." },
      gospel: { id: "mock-gospel", title: "Преображення", reference: "Мт. 17:1-9", text: "І, взявши Петра, Якова..." },
      article: { id: "mock-article", title: "Про свято Преображення", content: "Коротка стаття про історію свята." },
      imageUrl: null,
    };
  },
  posts: {
    async list() {
      await mockDelay(200);
      return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async get(id: string) {
      await mockDelay(150);
      const post = posts.find((p) => p.id === id);
      if (!post) throw new ApiError("not_found", "Публікацію не знайдено");
      return post;
    },
    async create(values: TelegramPostFormValues) {
      await mockDelay(200);
      const now = new Date().toISOString();
      const post: TelegramPost = {
        id: String(nextPostId++),
        sourceType: null,
        sourceId: null,
        text: values.text ?? null,
        mediaUrl: values.mediaUrl || null,
        telegramMessageId: null,
        status: values.scheduledAt ? "scheduled" : "draft",
        scheduledAt: values.scheduledAt || null,
        sentAt: null,
        errorMessage: null,
        contentType: null,
        publishDate: null,
        verificationStatus: null,
        verificationError: null,
        createdAt: now,
        updatedAt: now,
      };
      posts = [post, ...posts];
      return post;
    },
    async update(id: string, values: TelegramPostFormValues) {
      await mockDelay(200);
      const current = posts.find((p) => p.id === id);
      if (!current) throw new ApiError("not_found", "Публікацію не знайдено");
      if (current.status === "sent") throw new ApiError("conflict", "Публікація вже надіслана");

      const updated: TelegramPost = {
        ...current,
        text: values.text !== undefined ? values.text : current.text,
        mediaUrl: values.mediaUrl !== undefined ? values.mediaUrl : current.mediaUrl,
        scheduledAt: values.scheduledAt !== undefined ? values.scheduledAt : current.scheduledAt,
        status: (values.scheduledAt ?? current.scheduledAt) ? "scheduled" : "draft",
        updatedAt: new Date().toISOString(),
      };
      posts = posts.map((p) => (p.id === id ? updated : p));
      return updated;
    },
    async publish(id: string) {
      await mockDelay(300);
      const current = posts.find((p) => p.id === id);
      if (!current) throw new ApiError("not_found", "Публікацію не знайдено");
      if (current.status === "sent") throw new ApiError("conflict", "Публікація вже надіслана");

      const updated: TelegramPost = {
        ...current,
        status: "sent",
        telegramMessageId: Math.floor(Math.random() * 100000),
        sentAt: new Date().toISOString(),
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      };
      posts = posts.map((p) => (p.id === id ? updated : p));
      return updated;
    },
  },
  autopost: {
    async getSettings() {
      await mockDelay(150);
      return autopostSettings;
    },
    async updateSettings(values: AutopostSettingsFormValues) {
      await mockDelay(200);
      autopostSettings = {
        globalEnabled: values.globalEnabled,
        items: autopostSettings.items.map((current) => {
          const update = values.items.find((item) => item.contentType === current.contentType);
          return update ? { ...current, enabled: update.enabled, scheduleTime: update.scheduleTime } : current;
        }),
      };
      return autopostSettings;
    },
  },
  contentPlan: {
    async get(query?: ContentPlanQuery): Promise<ContentPlanReport> {
      await mockDelay(250);
      const year = query?.year ?? new Date().getUTCFullYear();
      const from = query?.from ?? `${year}-01-01`;
      const to = query?.to ?? `${year}-12-31`;
      const days: ContentPlanDay[] = [];
      for (let cursor = new Date(`${from}T00:00:00Z`); cursor.getTime() <= new Date(`${to}T00:00:00Z`).getTime(); ) {
        days.push(mockDay(cursor.toISOString().slice(0, 10)));
        cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
      }
      return { generatedAt: new Date().toISOString(), fromCivilDate: from, toCivilDate: to, days, summary: mockSummary(days) };
    },
    async getDay(date: string): Promise<ContentPlanDay> {
      await mockDelay(150);
      const day = mockDay(date);
      for (const slot of Object.values(day.slots)) {
        const prepared = preparedSlots.get(slotKey(date, slot.contentType));
        const fullText = prepared?.text ?? (slot.textAvailable ? "Мок-текст для попереднього перегляду у бічній панелі." : undefined);
        if (fullText) {
          slot.textPreview = fullText.slice(0, 200);
          slot.fullText = fullText;
          const longText = fullText.length > 1000;
          slot.deliveryPreview = slot.imageAvailable
            ? {
                kind: longText ? "photo_then_text" : "photo_with_caption",
                photoCaption: longText ? "Продовження — у наступному повідомленні." : null,
              }
            : { kind: "text_only", photoCaption: null };
        }
      }
      return day;
    },
    async generateText(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      await mockDelay(400);
      const current = findOrCreateSlot(date, contentType);
      assertSlotMutable(current);
      if (current.text?.trim()) throw new ApiError("conflict", "Текст вже існує -- скористайтеся регенерацією");
      return saveSlot(date, contentType, { text: `Мок-текст (${contentType}) для ${date}.` });
    },
    async regenerateText(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      await mockDelay(400);
      assertSlotMutable(findOrCreateSlot(date, contentType));
      return saveSlot(date, contentType, { text: `Новий мок-текст (${contentType}) для ${date}.`, status: "draft" });
    },
    async editText(date: string, contentType: AutopostContentType, text: string): Promise<TelegramPost> {
      await mockDelay(200);
      assertSlotMutable(findOrCreateSlot(date, contentType));
      return saveSlot(date, contentType, { text, status: "draft" });
    },
    async generateImage(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      await mockDelay(400);
      const current = findOrCreateSlot(date, contentType);
      assertSlotMutable(current);
      if (current.mediaUrl) throw new ApiError("conflict", "Зображення вже існує -- скористайтеся регенерацією");
      return saveSlot(date, contentType, { mediaUrl: "https://placehold.co/600x400" });
    },
    async regenerateImage(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      await mockDelay(400);
      assertSlotMutable(findOrCreateSlot(date, contentType));
      return saveSlot(date, contentType, { mediaUrl: `https://placehold.co/600x400?text=${Date.now()}` });
    },
    async assignImage(date: string, contentType: AutopostContentType, mediaUrl: string): Promise<TelegramPost> {
      await mockDelay(200);
      assertSlotMutable(findOrCreateSlot(date, contentType));
      return saveSlot(date, contentType, { mediaUrl });
    },
    async markReady(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      await mockDelay(200);
      const current = findOrCreateSlot(date, contentType);
      assertSlotMutable(current);
      if (!current.text?.trim()) throw new ApiError("validation_error", "Неможливо позначити готовим: немає тексту");
      return saveSlot(date, contentType, { status: "ready" });
    },
    async markUnready(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      await mockDelay(200);
      assertSlotMutable(findOrCreateSlot(date, contentType));
      return saveSlot(date, contentType, { status: "draft" });
    },
    async prepareDay(date: string): Promise<PrepareDayReport> {
      await mockDelay(800);
      const inRange = date >= "2026-09-01" && date <= "2026-09-30";
      const results: PrepareDayReport["results"] = [];
      for (const contentType of AUTOPOST_CONTENT_TYPES) {
        const existing = preparedSlots.get(slotKey(date, contentType));
        if (existing?.status === "sent") {
          results.push({ contentType, result: "skipped_sent" });
          continue;
        }
        if (existing?.status === "sending") {
          results.push({ contentType, result: "skipped_sending" });
          continue;
        }
        if (existing?.status === "ready") {
          results.push({ contentType, result: "skipped_ready" });
          continue;
        }
        const needsText = !existing?.text?.trim();
        const needsImage = !existing?.mediaUrl;
        if (!needsText && !needsImage) {
          results.push({ contentType, result: "already_prepared" });
          continue;
        }
        if (!inRange) {
          results.push({ contentType, result: "missing_source" });
          continue;
        }
        const patch: Partial<TelegramPost> = {};
        if (needsText) patch.text = `Мок-текст (${contentType}) для ${date} (підготовлено автоматично).`;
        if (needsImage) patch.mediaUrl = "https://placehold.co/600x400";
        saveSlot(date, contentType, patch);
        results.push({ contentType, result: "prepared" });
      }

      const report: PrepareDayReport = {
        date,
        total: results.length,
        prepared: 0,
        alreadyPrepared: 0,
        skippedReady: 0,
        skippedSent: 0,
        skippedSending: 0,
        missingSource: 0,
        reviewRequired: 0,
        imageFailed: 0,
        failed: 0,
        results,
      };
      for (const { result } of results) {
        if (result === "prepared") report.prepared += 1;
        else if (result === "already_prepared") report.alreadyPrepared += 1;
        else if (result === "skipped_ready") report.skippedReady += 1;
        else if (result === "skipped_sent") report.skippedSent += 1;
        else if (result === "skipped_sending") report.skippedSending += 1;
        else if (result === "missing_source") report.missingSource += 1;
        else if (result === "review_required") report.reviewRequired += 1;
        else if (result === "image_failed") report.imageFailed += 1;
        else if (result === "failed") report.failed += 1;
      }
      return report;
    },
  },
};
