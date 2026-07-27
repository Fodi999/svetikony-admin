import { z } from "zod";

export const orderStatusSchema = z.enum(["new", "in_progress", "completed", "cancelled"]);

/** Order editing is limited to what the backend is expected to support: status, read flag, and internal note. */
export const orderUpdateSchema = z.object({
  status: orderStatusSchema,
  isRead: z.boolean(),
  internalNote: z.string().max(2000).optional(),
});

export type OrderUpdateFormValues = z.infer<typeof orderUpdateSchema>;
