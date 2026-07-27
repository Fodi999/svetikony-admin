import { z } from "zod";
import { languageSchema, slugSchema } from "./common";

export const alphabetLetterSchema = z.object({
  slug: slugSchema,
  language: languageSchema,
  order: z.number().int().min(0),
  name: z.string().min(1, "Обов'язкове поле").max(100),
  pronunciation: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  historicalNote: z.string().max(3000).optional(),
  numericValue: z.number().int().min(0).max(999).optional(),
  mainImageId: z.string().optional(),
});

export type AlphabetLetterFormValues = z.infer<typeof alphabetLetterSchema>;
