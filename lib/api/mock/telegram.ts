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
 * day, exactly like the real backend reports for a day it has no row for. */
function mockDay(civilDate: string): ContentPlanDay {
  const inRange = civilDate >= "2026-09-01" && civilDate <= "2026-09-30";
  const slots = {} as Record<AutopostContentType, ContentPlanSlot>;
  for (const contentType of AUTOPOST_CONTENT_TYPES) {
    slots[contentType] = {
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
  return { civilDate, julianDate: civilDate, calendarTitle: inRange ? "Мок: святий дня" : null, slots };
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
        if (slot.textAvailable) slot.textPreview = "Мок-текст для попереднього перегляду у бічній панелі.";
      }
      return day;
    },
  },
};
