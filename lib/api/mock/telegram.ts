import type { TelegramApi } from "@/lib/api/client";
import { mockDelay } from "@/lib/api/mock-utils";
import type { TelegramPostFormValues } from "@/lib/validation/telegram.schema";
import { ApiError } from "@/types/api";
import type { TelegramChat, TelegramPost, TelegramUser } from "@/types/entities";

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
};
