import { z } from "zod";
import { contentStatusSchema, languageSchema, slugSchema } from "./common";

export const articleSchema = z.object({
  title: z.string().min(2, "Мінімум 2 символи").max(200),
  slug: slugSchema,
  language: languageSchema,
  content: z.string().min(10, "Зміст статті занадто короткий"),
  seoTitle: z.string().max(70, "SEO-заголовок краще до 70 символів").optional(),
  seoDescription: z.string().max(160, "SEO-опис краще до 160 символів").optional(),
  status: contentStatusSchema,
  // No coverImageId/relatedSaintIds: the real backend has no column for
  // either (see types/entities.ts's Article doc comment) — removed rather
  // than kept as fields that validate and submit but never persist.
  iconId: z.string().optional(),
});

export type ArticleFormValues = z.infer<typeof articleSchema>;
