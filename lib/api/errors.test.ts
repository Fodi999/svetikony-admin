import { describe, expect, it } from "vitest";
import { errorMessageFor } from "./errors";
import { ApiError } from "@/types/api";

describe("errorMessageFor", () => {
  // The real bug this fixes: every validation_error (wrong file format,
  // oversized upload, a language-guard rejection, ...) used to render as
  // the same generic "Перевірте правильність заповнення полів." regardless
  // of what the backend actually said went wrong.
  it("shows the specific backend message for a validation_error, not the generic fallback", () => {
    const error = new ApiError("validation_error", 'Виявлено текст іншою мовою: "spread the"');
    expect(errorMessageFor(error)).toBe('Виявлено текст іншою мовою: "spread the"');
  });

  it("shows the specific message for a conflict, not the generic 'duplicate record' text", () => {
    const error = new ApiError("conflict", "this slot has already been sent and can no longer be changed");
    expect(errorMessageFor(error)).toBe("this slot has already been sent and can no longer be changed");
  });

  it("shows the specific message for a not_found error", () => {
    const error = new ApiError("not_found", "nothing has been prepared for this slot yet");
    expect(errorMessageFor(error)).toBe("nothing has been prepared for this slot yet");
  });

  it("falls back to the generic per-code message when the ApiError has no specific message", () => {
    const error = new ApiError("validation_error", "");
    expect(errorMessageFor(error)).toBe("Перевірте правильність заповнення полів.");
  });

  it("falls back to the generic network_error message when none is set", () => {
    const error = new ApiError("network_error", "");
    expect(errorMessageFor(error)).toBe("Немає з'єднання з сервером. Перевірте інтернет і спробуйте ще раз.");
  });

  it("wraps a plain thrown Error using its own message", () => {
    expect(errorMessageFor(new Error("boom"))).toBe("boom");
  });

  it("uses toApiError's own placeholder message for a non-Error thrown value", () => {
    expect(errorMessageFor("just a string")).toBe("Сталася невідома помилка");
  });
});
