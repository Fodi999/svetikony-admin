import { z } from "zod";
import { contentStatusSchema, languageSchema, slugSchema } from "./common";

export const gospelReadingSchema = z.object({
  title: z.string().min(2, "Мінімум 2 символи").max(200),
  slug: slugSchema,
  language: languageSchema,
  reference: z.string().min(2, "Наприклад: Ів. 1:1-17").max(200),
  text: z.string().min(10, "Текст читання занадто короткий"),
  explanation: z.string().max(5000).optional(),
  status: contentStatusSchema,
  relatedCalendarDayIds: z.array(z.string()),
});

export type GospelReadingFormValues = z.infer<typeof gospelReadingSchema>;
