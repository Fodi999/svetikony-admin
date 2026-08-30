import { z } from "zod";
import { AUTOPOST_CONTENT_TYPES } from "@/types/entities";

/** Telegram's hard message-length limit is 4096 UTF-16 code units; matches
 * the truncation guard already enforced server-side (svet-ikony's
 * lib/telegram/client.ts) — validated here too so the composer catches an
 * over-long draft before it's silently cut off at publish time. */
export const telegramPostSchema = z.object({
  text: z.string().min(1, "Текст обов'язковий").max(4096, "Максимум 4096 символів"),
  mediaUrl: z.string().url("Некоректне посилання").optional().or(z.literal("")),
  scheduledAt: z.string().optional().or(z.literal("")),
});

export type TelegramPostFormValues = z.infer<typeof telegramPostSchema>;

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Формат ГГ:ХХ");

export const autopostSettingsSchema = z.object({
  globalEnabled: z.boolean(),
  items: z.array(
    z.object({
      contentType: z.enum(AUTOPOST_CONTENT_TYPES),
      enabled: z.boolean(),
      scheduleTime: timeSchema,
    }),
  ),
});

export type AutopostSettingsFormValues = z.infer<typeof autopostSettingsSchema>;
