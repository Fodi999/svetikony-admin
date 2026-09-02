import type { BffAutopostSettingsDto, WorkerAutopostSettingsWritePayload } from "@/app/api/bff/telegram/autopost/settings/_contract";
import type { BffTelegramChatDto } from "@/app/api/bff/telegram/chats/_contract";
import type { BffContentPlanDayDto, BffContentPlanReportDto } from "@/app/api/bff/telegram/content-plan/_contract";
import type { BffTelegramPostDto, WorkerTelegramPostWritePayload } from "@/app/api/bff/telegram/posts/_contract";
import type { BffTelegramStatusDto } from "@/app/api/bff/telegram/status/_contract";
import type { BffTelegramTodayDto } from "@/app/api/bff/telegram/today/_contract";
import type { BffTelegramUserDto } from "@/app/api/bff/telegram/users/_contract";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { httpGet, httpPost, httpPut } from "@/lib/api/http/transport";
import type { TelegramApi } from "@/lib/api/client";
import type { AutopostSettingsFormValues, TelegramPostFormValues } from "@/lib/validation/telegram.schema";
import {
  AUTOPOST_CONTENT_TYPES,
  type AutopostContentType,
  type ContentPlanDay,
  type ContentPlanQuery,
  type ContentPlanReport,
  type TelegramAutopostSettings,
  type TelegramChat,
  type TelegramDashboardStatus,
  type TelegramPost,
  type TelegramTodayContent,
  type TelegramUser,
} from "@/types/entities";

/** BFF ids are still the D1 row's `number` — converted to `Identifiable`'s
 * `string` form here, same as every other entity in this admin. */
function toUser(dto: BffTelegramUserDto): TelegramUser {
  return { ...dto, id: String(dto.id) };
}

function toChat(dto: BffTelegramChatDto): TelegramChat {
  return { ...dto, id: String(dto.id) };
}

/** The Worker's `content_type` is an unconstrained TEXT column; narrowed
 * defensively rather than cast, same reasoning as saints.ts's safeEnum. */
function toAutopostContentType(value: string | null): AutopostContentType | null {
  return value && (AUTOPOST_CONTENT_TYPES as readonly string[]).includes(value) ? (value as AutopostContentType) : null;
}

function toPost(dto: BffTelegramPostDto): TelegramPost {
  return { ...dto, id: String(dto.id), contentType: toAutopostContentType(dto.contentType) };
}

function toPayload(values: TelegramPostFormValues): WorkerTelegramPostWritePayload {
  return {
    text: values.text ?? null,
    mediaUrl: values.mediaUrl || null,
    scheduledAt: values.scheduledAt || null,
  };
}

/** Shared caller for every Content Plan Stage 2 slot action -- all eight
 * are addressed by (date, contentType) rather than a numeric post id (see
 * TelegramApi.contentPlan's own doc comment for why). */
function slotAction(
  date: string,
  contentType: AutopostContentType,
  action: string,
  method: "POST" | "PUT",
  body?: unknown,
): Promise<BffTelegramPostDto> {
  const path = `${BFF_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}/${encodeURIComponent(contentType)}/${action}`;
  return method === "PUT" ? httpPut<BffTelegramPostDto>(path, body) : httpPost<BffTelegramPostDto>(path, body);
}

function toAutopostSettings(dto: BffAutopostSettingsDto): TelegramAutopostSettings {
  return {
    globalEnabled: dto.globalEnabled,
    items: dto.items
      .map((item) => ({ ...item, contentType: toAutopostContentType(item.contentType) }))
      .filter((item): item is TelegramAutopostSettings["items"][number] => item.contentType !== null),
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
  autopost: {
    async getSettings(): Promise<TelegramAutopostSettings> {
      return toAutopostSettings(await httpGet<BffAutopostSettingsDto>(BFF_ENDPOINTS.telegram.autopostSettings));
    },
    async updateSettings(values: AutopostSettingsFormValues): Promise<TelegramAutopostSettings> {
      const payload: WorkerAutopostSettingsWritePayload = values;
      return toAutopostSettings(await httpPut<BffAutopostSettingsDto>(BFF_ENDPOINTS.telegram.autopostSettings, payload));
    },
  },
  contentPlan: {
    async get(query?: ContentPlanQuery): Promise<ContentPlanReport> {
      const params = new URLSearchParams();
      if (query?.year) params.set("year", String(query.year));
      if (query?.from) params.set("from", query.from);
      if (query?.to) params.set("to", query.to);
      const qs = params.toString();
      return httpGet<BffContentPlanReportDto>(`${BFF_ENDPOINTS.telegram.contentPlan}${qs ? `?${qs}` : ""}`);
    },
    async getDay(date: string): Promise<ContentPlanDay> {
      return httpGet<BffContentPlanDayDto>(`${BFF_ENDPOINTS.telegram.contentPlan}/${encodeURIComponent(date)}`);
    },
    async generateText(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      return toPost(await slotAction(date, contentType, "generate-text", "POST"));
    },
    async regenerateText(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      return toPost(await slotAction(date, contentType, "regenerate-text", "POST"));
    },
    async editText(date: string, contentType: AutopostContentType, text: string): Promise<TelegramPost> {
      return toPost(await slotAction(date, contentType, "text", "PUT", { text }));
    },
    async generateImage(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      return toPost(await slotAction(date, contentType, "generate-image", "POST"));
    },
    async regenerateImage(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      return toPost(await slotAction(date, contentType, "regenerate-image", "POST"));
    },
    async assignImage(date: string, contentType: AutopostContentType, mediaUrl: string): Promise<TelegramPost> {
      return toPost(await slotAction(date, contentType, "image", "PUT", { mediaUrl }));
    },
    async markReady(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      return toPost(await slotAction(date, contentType, "ready", "POST"));
    },
    async markUnready(date: string, contentType: AutopostContentType): Promise<TelegramPost> {
      return toPost(await slotAction(date, contentType, "unready", "POST"));
    },
  },
};
