import { z } from "zod";

export const languageSchema = z.enum(["uk", "ru", "en"]);

export const contentStatusSchema = z.enum(["draft", "published", "archived"]);

export const slugSchema = z
  .string()
  .min(2, "Мінімум 2 символи")
  .max(120, "Максимум 120 символів")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Тільки латиниця, цифри та дефіси, напр. moleben-o-zdorovi");

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Некоректний HEX-колір");

export const urlSchema = z.string().url("Некоректний URL").or(z.literal(""));

export const optionalUrlSchema = urlSchema.optional();
