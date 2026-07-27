import { z } from "zod";

export const churchScheduleEntrySchema = z.object({
  id: z.string(),
  dayLabel: z.string().min(1, "Обов'язкове поле"),
  serviceName: z.string().min(1, "Обов'язкове поле"),
  time: z.string().min(1, "Обов'язкове поле"),
});

export const churchSocialLinkSchema = z.object({
  id: z.string(),
  platform: z.string().min(1, "Обов'язкове поле"),
  url: z.string().url("Некоректний URL"),
});

export const churchInfoTranslationSchema = z.object({
  language: z.enum(["uk", "ru", "en"]),
  name: z.string().min(2, "Мінімум 2 символи").max(200),
  description: z.string().min(2).max(2000),
  history: z.string().max(10000),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
});

export const churchInfoSchema = z.object({
  address: z.string().min(2, "Обов'язкове поле"),
  phone: z.string().max(40).optional(),
  email: z.string().email("Некоректний email").optional().or(z.literal("")),
  logoImageId: z.string().optional(),
  coverImageIds: z.array(z.string()),
  schedule: z.array(churchScheduleEntrySchema),
  socialLinks: z.array(churchSocialLinkSchema),
  translations: z.object({
    uk: churchInfoTranslationSchema,
    ru: churchInfoTranslationSchema,
    en: churchInfoTranslationSchema,
  }),
});

export type ChurchInfoFormValues = z.infer<typeof churchInfoSchema>;
