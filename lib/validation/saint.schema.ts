import { z } from "zod";
import { contentStatusSchema, languageSchema, slugSchema } from "./common";

export const saintSchema = z.object({
  name: z.string().min(2, "Мінімум 2 символи").max(200),
  slug: slugSchema,
  language: languageSchema,
  shortDescription: z.string().min(2).max(500),
  biography: z.string().min(2).max(10000),
  feastDay: z
    .string()
    .regex(/^\d{2}-\d{2}$/, "Формат ММ-ДД")
    .optional()
    .or(z.literal("")),
  imageId: z.string().optional(),
  status: contentStatusSchema,
  relatedIconIds: z.array(z.string()),
  relatedCalendarDayIds: z.array(z.string()),
});

export type SaintFormValues = z.infer<typeof saintSchema>;
