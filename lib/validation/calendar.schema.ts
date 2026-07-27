import { z } from "zod";
import { contentStatusSchema, languageSchema, slugSchema } from "./common";

export const calendarEventTypeSchema = z.enum([
  "feast",
  "fast",
  "memorial",
  "liturgical",
  "civil",
]);

export const calendarDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат дати РРРР-ММ-ДД"),
  title: z.string().min(2, "Мінімум 2 символи").max(200),
  slug: slugSchema,
  language: languageSchema,
  shortDescription: z.string().min(2).max(500),
  history: z.string().max(5000).optional(),
  eventType: calendarEventTypeSchema,
  status: contentStatusSchema,
  imageId: z.string().optional(),
  relatedIconIds: z.array(z.string()),
  relatedPrayerIds: z.array(z.string()),
  relatedSaintIds: z.array(z.string()),
  relatedGospelIds: z.array(z.string()),
});

export type CalendarDayFormValues = z.infer<typeof calendarDaySchema>;
