import { z } from "zod";
import { contentStatusSchema, languageSchema, slugSchema } from "./common";

export const visualizerEventTypeSchema = z.enum(["biblical", "church_history", "historical", "saint", "council", "location", "other"]);

/** How much confidence the chronology fields below actually carry -- the
 * public visualizer must never present a "traditional"/"approximate"/
 * "period"/"unknown" date as an established exact fact. See
 * types/entities.ts's VisualizerEvent doc comment. */
export const visualizerChronologyTypeSchema = z.enum(["exact", "approximate", "traditional", "period", "unknown"]);

export const visualizerEraSchema = z.enum([
  "biblical_creation",
  "biblical_old_testament",
  "biblical_new_testament",
  "apostolic",
  "early_church",
  "byzantine",
  "medieval",
  "modern",
  "contemporary",
  "custom",
]);

export const visualizerCalendarEraSchema = z.enum(["BC", "AD", "unknown"]);

export const visualizerEventSchema = z.object({
  slug: slugSchema,
  language: languageSchema,
  title: z.string().min(1, "Обов'язкове поле").max(200),
  summary: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  eventType: visualizerEventTypeSchema,
  chronologyType: visualizerChronologyTypeSchema,
  era: visualizerEraSchema,
  calendarEra: visualizerCalendarEraSchema,
  yearStart: z.number().int().optional(),
  yearEnd: z.number().int().optional(),
  century: z.number().int().optional(),
  displayDate: z.string().max(200).optional(),
  locationName: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status: contentStatusSchema,
  isFeatured: z.boolean(),
});

export type VisualizerEventFormValues = z.infer<typeof visualizerEventSchema>;
