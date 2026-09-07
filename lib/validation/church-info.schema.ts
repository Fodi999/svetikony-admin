import { z } from "zod";
import { contentStatusSchema } from "./common";

/**
 * Phase 2B-4: no hard-required minimums on any content field (title
 * included). svet-ikony's real church_info table has zero CHECK
 * constraints beyond `status` -- every text column is `NOT NULL DEFAULT
 * ''`, and the table currently has 0 rows in production. A required
 * `title` would block the very first save from a genuinely blank slate
 * (e.g. an admin who wants to save just the address and phone today, then
 * fill in translations later) -- same reasoning as Gospel's `text` field
 * (Phase 2B-3): match the backend's real permissiveness, don't invent a
 * stricter rule the backend itself doesn't enforce.
 */
export const churchInfoTranslationSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  schedule: z.string().max(2000).optional(),
  dedication: z.string().max(500).optional(),
  shrines: z.string().max(1000).optional(),
  priest: z.string().max(200).optional(),
});

export const churchInfoSchema = z.object({
  address: z.string().max(500).optional(),
  mapsUrl: z.string().max(500).optional(),
  phoneOrSite: z.string().max(200).optional(),
  priestPhone: z.string().max(100).optional(),
  imageUrl: z.string().max(500).optional(),
  status: contentStatusSchema,
  translations: z.object({
    uk: churchInfoTranslationSchema,
    ru: churchInfoTranslationSchema,
    en: churchInfoTranslationSchema,
  }),
});

export type ChurchInfoFormValues = z.infer<typeof churchInfoSchema>;
