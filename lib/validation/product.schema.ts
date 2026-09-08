import { z } from "zod";
import { slugSchema } from "./common";

export const stockStatusSchema = z.enum(["in_stock", "made_to_order", "out_of_stock"]);

export const productVariantSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Обов'язкове поле"),
  priceOverride: z.number().min(0).optional(),
  sku: z.string().max(80).optional(),
});

/**
 * Phase MULTILINGUAL-1 (P1.1): icon_order_options has name_uk/name_ru/
 * name_en, full_description_uk/full_description_ru/full_description_en,
 * and seo_title_uk/ru/en + seo_description_uk/ru/en as columns on one row
 * (see types/entities.ts's ProductTranslation doc comment). Only the UK title
 * is required, matching the real backend's own
 * `required(payload.nameUk, 'nameUk')` (svet-ikony's createProduct/
 * updateProduct) -- RU/EN stay fully optional. `fullDescription` is a new
 * field this phase adds admin editing for at all (full_description_* had
 * no admin UI before); it's distinct from the plain `description` field
 * below, which has no *_ru/*_en column and stays a single flat value.
 */
const requiredProductTranslationSchema = z.object({
  title: z.string().min(2, "Мінімум 2 символи").max(200),
  fullDescription: z.string().max(5000).optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
});

const optionalProductTranslationSchema = z.object({
  title: z.string().max(200).optional(),
  fullDescription: z.string().max(5000).optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
});

export const productSchema = z.object({
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
  translations: z.object({
    uk: requiredProductTranslationSchema,
    ru: optionalProductTranslationSchema,
    en: optionalProductTranslationSchema,
  }),
});

export type ProductFormValues = z.infer<typeof productSchema>;
