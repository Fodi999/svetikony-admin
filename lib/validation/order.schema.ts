import { z } from "zod";

/** The authoritative 8 values — see types/entities.ts's OrderStatus doc
 * comment for how this was verified. */
export const orderStatusSchema = z.enum([
  "new",
  "contacted",
  "confirmed",
  "in_production",
  "ready",
  "shipped",
  "completed",
  "cancelled",
]);

/** Phase 2B-5B: status and note are edited and saved independently (see
 * the phase report's UPDATE SEMANTICS section) — svet-ikony's real PUT
 * already merges correctly against the current row for whichever field is
 * omitted, and sending only the one field that actually changed keeps
 * that guarantee visible in the client code too, not just relied upon
 * silently. No combined "one big form" schema; just the note's own light
 * validation (status changes are always one of a fixed, already-valid set
 * of buttons/dropdown options, needing no free-text validation). */
export const orderNoteSchema = z.object({
  adminNote: z.string().max(2000).optional(),
});

export type OrderNoteFormValues = z.infer<typeof orderNoteSchema>;
