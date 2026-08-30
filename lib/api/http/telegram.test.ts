import { afterEach, describe, expect, it, vi } from "vitest";
import { telegramHttpResource } from "./telegram";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const userDto = {
  id: 1,
  telegramUserId: 1142224362,
  username: "fodi999",
  firstName: "Дмитро",
  lastName: null,
  languageCode: "uk",
  isBot: false,
  isActive: true,
  createdAt: "2026-08-30T10:32:34Z",
  updatedAt: "2026-08-30T10:32:34Z",
};

const chatDto = {
  id: 1,
  telegramChatId: 1142224362,
  chatType: "private",
  title: null,
  username: "fodi999",
  isActive: true,
  createdAt: "2026-08-30T10:32:34Z",
  updatedAt: "2026-08-30T10:32:34Z",
};

function postDto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    sourceType: null,
    sourceId: null,
    text: "Hello",
    mediaUrl: null,
    telegramMessageId: null,
    status: "draft",
    scheduledAt: null,
    sentAt: null,
    errorMessage: null,
    createdAt: "2026-08-30T10:00:00Z",
    updatedAt: "2026-08-30T10:00:00Z",
    ...overrides,
  };
}

describe("telegramHttpResource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getStatus fetches /api/bff/telegram/status and returns it as-is", async () => {
    const status = {
      configured: true,
      channel: "@svit_ikony",
      webhook: { url: "https://svetikony.com/api/telegram/webhook", pendingUpdateCount: 0, lastErrorMessage: null },
      stats: { userCount: 1, chatCount: 1, lastActivityAt: "2026-08-30T10:32:34Z" },
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(status));
    vi.stubGlobal("fetch", fetchMock);

    const result = await telegramHttpResource.getStatus();

    expect(result).toEqual(status);
    expect(fetchMock).toHaveBeenCalledWith("/api/bff/telegram/status", expect.objectContaining({ method: "GET" }));
  });

  it("listUsers converts the numeric D1 id to a string id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([userDto])));
    const users = await telegramHttpResource.listUsers();
    expect(users).toEqual([{ ...userDto, id: "1" }]);
  });

  it("listChats converts the numeric D1 id to a string id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([chatDto])));
    const chats = await telegramHttpResource.listChats();
    expect(chats).toEqual([{ ...chatDto, id: "1" }]);
  });

  it("getToday fetches /api/bff/telegram/today", async () => {
    const today = { calendarDay: null, saint: null, prayer: null, gospel: null, article: null, imageUrl: null };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(today));
    vi.stubGlobal("fetch", fetchMock);

    const result = await telegramHttpResource.getToday();

    expect(result).toEqual(today);
    expect(fetchMock).toHaveBeenCalledWith("/api/bff/telegram/today", expect.objectContaining({ method: "GET" }));
  });

  describe("posts", () => {
    it("list maps every post's id to a string", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([postDto({ id: 1 }), postDto({ id: 2 })])));
      const posts = await telegramHttpResource.posts.list();
      expect(posts.map((p) => p.id)).toEqual(["1", "2"]);
    });

    it("get requests the encoded id route", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(postDto()));
      vi.stubGlobal("fetch", fetchMock);
      await telegramHttpResource.posts.get("1");
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/telegram/posts/1", expect.objectContaining({ method: "GET" }));
    });

    it("create POSTs the trimmed payload (no sourceType/sourceId from the form)", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(postDto(), 201));
      vi.stubGlobal("fetch", fetchMock);

      const post = await telegramHttpResource.posts.create({ text: "Hello", mediaUrl: "", scheduledAt: "" });

      expect(post.id).toBe("1");
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/telegram/posts", expect.objectContaining({ method: "POST" }));
      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body as string)).toEqual({ text: "Hello", mediaUrl: null, scheduledAt: null });
    });

    it("update PUTs to the single-post route", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(postDto({ text: "Edited" })));
      vi.stubGlobal("fetch", fetchMock);

      const post = await telegramHttpResource.posts.update("1", { text: "Edited", mediaUrl: "", scheduledAt: "" });

      expect(post.text).toBe("Edited");
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/telegram/posts/1", expect.objectContaining({ method: "PUT" }));
    });

    it("update propagates a conflict ApiError when the Worker rejects an already-sent post", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "CONFLICT" }, 409)));
      await expect(telegramHttpResource.posts.update("1", { text: "x", mediaUrl: "", scheduledAt: "" })).rejects.toMatchObject({
        code: "conflict",
      });
    });

    it("publish POSTs to the publish sub-route with no body", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(postDto({ status: "sent", telegramMessageId: 555 })));
      vi.stubGlobal("fetch", fetchMock);

      const post = await telegramHttpResource.posts.publish("1");

      expect(post.status).toBe("sent");
      expect(post.telegramMessageId).toBe(555);
      expect(fetchMock).toHaveBeenCalledWith("/api/bff/telegram/posts/1/publish", expect.objectContaining({ method: "POST" }));
      const [, init] = fetchMock.mock.calls[0];
      expect(init.body).toBeUndefined();
    });
  });
});
