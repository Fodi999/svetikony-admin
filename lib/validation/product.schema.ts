import { z } from "zod";
import { slugSchema } from "./common";

export const stockStatusSchema = z.enum(["in_stock", "made_to_order", "out_of_stock"]);

export const productVariantSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Обов'язкове поле"),
  priceOverride: z.number().min(0).optional(),
  sku: z.string().max(80).optional(),
});

export const productSchema = z.object({
  title: z.string().min(2, "Мінімум 2 символи").max(200),
  slug: slugSchema,
  description: z.string().min(2).max(5000),
  price: z.number().min(0, "Ціна не може бути відʼємною"),
  currency: z.string().min(3).max(3, "Триблітерний код, напр. UAH"),
  stockStatus: stockStatusSchema,
  featured: z.boolean(),
  active: z.boolean(),
  imageIds: z.array(z.string()),
  categoryId: z.string().min(1, "Оберіть категорію"),
  linkedIconId: z.string().optional(),
  dimensions: z.string().max(120).optional(),
  materials: z.string().max(300).optional(),
  productionTimeDays: z.number().int().min(0).max(365).optional(),
  consecrated: z.boolean(),
  variants: z.array(productVariantSchema),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
