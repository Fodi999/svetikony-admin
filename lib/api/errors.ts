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

/**
 * Prefers the backend/transport-layer's own specific message over the
 * generic per-code fallback -- every ApiError constructed anywhere in this
 * codebase already carries a safe, human-authored reason in `.message`
 * (the transport layer builds it from the backend's own `details`/
 * `message` field -- see lib/api/http/transport.ts; svet-ikony's backend
 * ApiError factories, in turn, always pass a deliberately safe `details`
 * string for every non-5xx error, see its own lib/d1/errors.ts). Showing
 * only the generic code-based text regardless of the actual reason was a
 * real bug: every validation_error (a wrong file format, an oversized
 * upload, a language-guard rejection, a specific "already sent" conflict,
 * ...) rendered as the same unhelpful "Перевірте правильність заповнення
 * полів." no matter what actually went wrong, leaving no way for the user
 * to tell what to fix. Falls back to the generic per-code text only when
 * there's genuinely no specific message to show.
 */
export function errorMessageFor(error: unknown): string {
  const apiError = toApiError(error);
  return apiError.message || ERROR_MESSAGES[apiError.code] || ERROR_MESSAGES.unknown;
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
