import { z } from "zod";

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
