import type { BffTelegramChatDto } from "@/app/api/bff/telegram/chats/_contract";
import type { BffTelegramPostDto, WorkerTelegramPostWritePayload } from "@/app/api/bff/telegram/posts/_contract";
import type { BffTelegramStatusDto } from "@/app/api/bff/telegram/status/_contract";
import type { BffTelegramTodayDto } from "@/app/api/bff/telegram/today/_contract";
import type { BffTelegramUserDto } from "@/app/api/bff/telegram/users/_contract";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { httpGet, httpPost, httpPut } from "@/lib/api/http/transport";
import type { TelegramApi } from "@/lib/api/client";
import type { TelegramPostFormValues } from "@/lib/validation/telegram.schema";
import type { TelegramChat, TelegramDashboardStatus, TelegramPost, TelegramTodayContent, TelegramUser } from "@/types/entities";

/** BFF ids are still the D1 row's `number` — converted to `Identifiable`'s
 * `string` form here, same as every other entity in this admin. */
function toUser(dto: BffTelegramUserDto): TelegramUser {
  return { ...dto, id: String(dto.id) };
}

function toChat(dto: BffTelegramChatDto): TelegramChat {
  return { ...dto, id: String(dto.id) };
}

function toPost(dto: BffTelegramPostDto): TelegramPost {
  return { ...dto, id: String(dto.id) };
}

function toPayload(values: TelegramPostFormValues): WorkerTelegramPostWritePayload {
  return {
    text: values.text ?? null,
    mediaUrl: values.mediaUrl || null,
    scheduledAt: values.scheduledAt || null,
  };
}

export const telegramHttpResource: TelegramApi = {
  async getStatus(): Promise<TelegramDashboardStatus> {
    return httpGet<BffTelegramStatusDto>(BFF_ENDPOINTS.telegram.status);
  },
  async listUsers(): Promise<TelegramUser[]> {
    const dtos = await httpGet<BffTelegramUserDto[]>(BFF_ENDPOINTS.telegram.users);
    return dtos.map(toUser);
  },
  async listChats(): Promise<TelegramChat[]> {
    const dtos = await httpGet<BffTelegramChatDto[]>(BFF_ENDPOINTS.telegram.chats);
    return dtos.map(toChat);
  },
  async getToday(): Promise<TelegramTodayContent> {
    return httpGet<BffTelegramTodayDto>(BFF_ENDPOINTS.telegram.today);
  },
  posts: {
    async list(): Promise<TelegramPost[]> {
      const dtos = await httpGet<BffTelegramPostDto[]>(BFF_ENDPOINTS.telegram.posts);
      return dtos.map(toPost);
    },
    async get(id: string): Promise<TelegramPost> {
      return toPost(await httpGet<BffTelegramPostDto>(`${BFF_ENDPOINTS.telegram.posts}/${encodeURIComponent(id)}`));
    },
    async create(values: TelegramPostFormValues): Promise<TelegramPost> {
      return toPost(await httpPost<BffTelegramPostDto>(BFF_ENDPOINTS.telegram.posts, toPayload(values)));
    },
    async update(id: string, values: TelegramPostFormValues): Promise<TelegramPost> {
      return toPost(
        await httpPut<BffTelegramPostDto>(`${BFF_ENDPOINTS.telegram.posts}/${encodeURIComponent(id)}`, toPayload(values)),
      );
    },
    async publish(id: string): Promise<TelegramPost> {
      return toPost(await httpPost<BffTelegramPostDto>(`${BFF_ENDPOINTS.telegram.posts}/${encodeURIComponent(id)}/publish`, undefined));
    },
  },
};
