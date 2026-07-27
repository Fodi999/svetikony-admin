import { z } from "zod";
import { slugSchema } from "./common";

export const productCategorySchema = z.object({
  name: z.string().min(2, "Мінімум 2 символи").max(150),
  slug: slugSchema,
  description: z.string().max(1000).optional(),
  imageId: z.string().optional(),
  order: z.number().int().min(0),
  active: z.boolean(),
});

export type ProductCategoryFormValues = z.infer<typeof productCategorySchema>;
