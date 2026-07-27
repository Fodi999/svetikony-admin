import { z } from "zod";
import { contentStatusSchema, hexColorSchema, languageSchema, slugSchema } from "./common";

export const prayerTypeSchema = z.enum([
  "morning",
  "evening",
  "before_meal",
  "after_meal",
  "to_saint",
  "to_icon",
  "feast",
  "general",
]);

export const particleColorModeSchema = z.enum(["single", "gradient", "theme"]);

export const subtitleCueSchema = z
  .object({
    id: z.string(),
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    text: z.string().min(1, "Текст субтитра обов'язковий"),
  })
  .refine((cue) => cue.endMs > cue.startMs, {
    message: "Кінець має бути пізніше початку",
    path: ["endMs"],
  });

export const sceneTimelineEventSchema = z.object({
  id: z.string(),
  atMs: z.number().int().min(0),
  label: z.string().min(1, "Назва події обов'язкова"),
  intensity: z.number().min(0).max(1),
});

export const prayerSchema = z.object({
  title: z.string().min(2, "Мінімум 2 символи").max(200),
  slug: slugSchema,
  text: z.string().min(10, "Текст молитви занадто короткий"),
  language: languageSchema,
  prayerType: prayerTypeSchema,
  status: contentStatusSchema,
  iconId: z.string().optional(),
  calendarDayId: z.string().optional(),
  audioUrl: z.string().url().optional().or(z.literal("")),
  qrCodeUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  source: z.string().max(200).optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  note: z.string().max(1000).optional(),

  visualizerEnabled: z.boolean(),
  visualizerImageUrl: z.string().url().optional().or(z.literal("")),
  particleCountDesktop: z.number().int().min(0).max(20000),
  particleCountMobile: z.number().int().min(0).max(8000),
  particleSize: z.number().min(0.1).max(20),
  particleColorMode: particleColorModeSchema,
  backgroundColor: hexColorSchema,
  audioReactivity: z.number().min(0).max(1),
  sceneTimeline: z.array(sceneTimelineEventSchema),
  subtitleCues: z.array(subtitleCueSchema),
});

export type PrayerFormValues = z.infer<typeof prayerSchema>;
