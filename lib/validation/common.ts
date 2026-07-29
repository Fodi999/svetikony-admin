import { z } from "zod";

export const languageSchema = z.enum(["uk", "ru", "en"]);

export const contentStatusSchema = z.enum(["draft", "published", "archived"]);

/**
 * Matches svet-ikony's backend slugify() (lib/d1/slug.ts): Unicode-aware,
 * lowercase letters (any script, e.g. Cyrillic) + digits, hyphen-separated.
 * Deliberately NOT restricted to `[a-z0-9]` — the real API accepts and
 * produces non-Latin slugs (verified against church_alphabet_letters).
 * Uppercase is still rejected: it would never come out of the backend's own
 * slugify(), which lowercases first.
 */
export const slugSchema = z
  .string()
  .min(2, "Мінімум 2 символи")
  .max(120, "Максимум 120 символів")
  .regex(/^[\p{Ll}\p{N}]+(-[\p{Ll}\p{N}]+)*$/u, "Малі літери (будь-якою мовою), цифри та дефіси, напр. moleben-o-zdorovi");

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Некоректний HEX-колір");

export const urlSchema = z.string().url("Некоректний URL").or(z.literal(""));

export const optionalUrlSchema = urlSchema.optional();
