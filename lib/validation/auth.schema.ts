import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Некоректний email"),
  password: z.string().min(4, "Мінімум 4 символи"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
