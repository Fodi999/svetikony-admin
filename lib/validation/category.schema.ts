import { z } from "zod";
import { slugSchema } from "./common";

/**
 * Phase MULTILINGUAL-1 (P1.2): icon_product_categories has name_uk/name_ru/
 * name_en + description_uk/description_ru/description_en as columns on one
 * row (see types/entities.ts's ProductCategoryTranslation doc comment).
 * Only the UK name is required, matching the real backend's own
 * `required(payload.nameUk, 'nameUk')` (svet-ikony's
 * createProductCategory/updateProductCategory) -- RU/EN stay fully
 * optional, same permissive treatment as Church Info's translations
 * (nothing populated yet is expected during this phase).
 */
const requiredCategoryTranslationSchema = z.object({
  name: z.string().min(2, "Мінімум 2 символи").max(150),
  description: z.string().max(1000).optional(),
});

const optionalCategoryTranslationSchema = z.object({
  name: z.string().max(150).optional(),
  description: z.string().max(1000).optional(),
});

export const productCategorySchema = z.object({
  slug: slugSchema,
  imageId: z.string().optional(),
  order: z.number().int().min(0),
  active: z.boolean(),
  translations: z.object({
    uk: requiredCategoryTranslationSchema,
    ru: optionalCategoryTranslationSchema,
    en: optionalCategoryTranslationSchema,
  }),
});

export type ProductCategoryFormValues = z.infer<typeof productCategorySchema>;
