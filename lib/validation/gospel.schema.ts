import { z } from "zod";
import { contentStatusSchema, languageSchema, slugSchema } from "./common";

export const gospelReadingSchema = z.object({
  title: z.string().min(2, "Мінімум 2 символи").max(200),
  slug: slugSchema,
  language: languageSchema,
  reference: z.string().min(2, "Наприклад: Ів. 1:1-17").max(200),
  // No min-length here (was min(10)): svet-ikony's real church_gospel_
  // readings.text column is NOT NULL DEFAULT '' with no CHECK constraint
  // -- empty text is a valid, real production state (5 seeded readings
  // have exactly this), and Phase 2B-3's whole point is making those rows
  // actually editable. A required minimum would have made saving any
  // edit to those rows (even just fixing `reference`) impossible without
  // also writing full reading text in the same submit -- see the Phase
  // 2B-3 report's EMPTY TEXT CONTRACT section for the full reasoning.
  text: z.string(),
  explanation: z.string().max(5000).optional(),
  status: contentStatusSchema,
  calendarDayId: z.string().optional(),
});

export type GospelReadingFormValues = z.infer<typeof gospelReadingSchema>;
