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
  coverImageId: z.string().optional(),
  relatedIconIds: z.array(z.string()),
  relatedSaintIds: z.array(z.string()),
});

export type ArticleFormValues = z.infer<typeof articleSchema>;
