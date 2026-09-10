import { z } from "zod";
// Mirrors the existing Worker validate-event.ts and ChurchVisualizerEventPayload.
// Status is intentionally narrowed to draft for this LOCAL-only extension.
export const visualId = z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
const positiveYear = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).nullable();
export const eventPatch = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    language: z.enum(["uk", "ru", "en"]).optional(),
    summary: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    eventType: z
      .enum(["biblical", "church_history", "historical", "saint", "council", "location", "other"])
      .optional(),
    chronologyType: z.enum(["exact", "approximate", "traditional", "period", "unknown"]).optional(),
    era: z
      .enum([
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
      ])
      .optional(),
    calendarEra: z.enum(["BC", "AD", "unknown"]).optional(),
    yearStart: positiveYear.optional(),
    yearEnd: positiveYear.optional(),
    century: positiveYear.optional(),
    sortYear: z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).optional(),
    displayDate: z.string().max(200).optional(),
    locationName: z.string().max(200).optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    calendarDayId: visualId.nullable().optional(),
    status: z.literal("draft").optional(),
    isFeatured: z.boolean().optional(),
  })
  .strict();
export const eventCreate = eventPatch.required({ title: true, slug: true, language: true });
export function validateChronology(row) {
  if ((row.latitude == null) !== (row.longitude == null))
    throw new Error("Provide both latitude and longitude, or neither");
  if (row.yearStart != null && row.yearEnd != null) {
    const sign = row.calendarEra === "BC" ? -1 : 1;
    if (sign * row.yearEnd < sign * row.yearStart) throw new Error("Period end precedes start");
  }
}
