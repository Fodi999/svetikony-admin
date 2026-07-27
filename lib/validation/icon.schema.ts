import { z } from "zod";
import { contentStatusSchema, languageSchema, slugSchema } from "./common";

export const iconSchema = z.object({
  slug: slugSchema,
  language: languageSchema,
  title: z.string().min(2, "Мінімум 2 символи").max(200),
  description: z.string().min(2).max(3000),
  history: z.string().max(5000).optional(),
  saintImageDescription: z.string().max(2000).optional(),
  materials: z.string().max(300).optional(),
  dimensions: z.string().max(120).optional(),
  mainImageId: z.string().optional(),
  galleryImageIds: z.array(z.string()),
  relatedPrayerIds: z.array(z.string()),
  relatedArticleIds: z.array(z.string()),
  relatedCalendarDayIds: z.array(z.string()),
  status: contentStatusSchema,
});

export type IconFormValues = z.infer<typeof iconSchema>;
