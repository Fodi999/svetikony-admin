import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/types/api";

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (error instanceof Error) {
    return new ApiError("unknown", error.message);
  }
  return new ApiError("unknown", "Сталася невідома помилка");
}

export const ERROR_MESSAGES: Record<string, string> = {
  network_error: "Немає з'єднання з сервером. Перевірте інтернет і спробуйте ще раз.",
  unauthorized: "Сесія закінчилася. Увійдіть, будь ласка, ще раз.",
  forbidden: "Недостатньо прав для цієї дії.",
  not_found: "Запис не знайдено.",
  validation_error: "Перевірте правильність заповнення полів.",
  conflict: "Такий запис уже існує.",
  server_error: "Помилка сервера. Спробуйте пізніше.",
  not_implemented: "Операція поки не підключена.",
  unknown: "Щось пішло не так.",
};

export function errorMessageFor(error: unknown): string {
  const apiError = toApiError(error);
  return ERROR_MESSAGES[apiError.code] ?? ERROR_MESSAGES.unknown;
}

/** Highlights the specific fields a 409/422 response flagged (e.g. a duplicate slug) directly on the form. */
export function applyApiFieldErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
): void {
  const apiError = toApiError(error);
  apiError.fieldErrors?.forEach((fieldError) => {
    setError(fieldError.path as Path<TFieldValues>, { message: fieldError.message });
  });
}
