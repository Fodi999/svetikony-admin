import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { CalendarAiField, CalendarAiWriteResult, CalendarDay } from "@/types/entities";

type AiActionName =
  | "generateDescription"
  | "regenerateDescription"
  | "generateHistory"
  | "regenerateHistory"
  | "generateSeo"
  | "regenerateSeo"
  | "generateImage"
  | "regenerateImage"
  | "assignImage"
  | "generateImageFromPrompt"
  | "fillMissing";

export type CalendarAiActions = {
  generateDescription: () => void;
  regenerateDescription: () => void;
  generateHistory: () => void;
  regenerateHistory: () => void;
  generateSeo: () => void;
  regenerateSeo: () => void;
  generateImage: () => void;
  regenerateImage: () => void;
  assignImage: (imageUrl: string) => void;
  generateImageFromPrompt: (prompt: string) => void;
  fillMissing: () => void;
  isBusy: boolean;
  isPending: (action: AiActionName) => boolean;
};

const FILL_FIELD_LABELS: Record<CalendarAiField, string> = {
  description: "короткий опис",
  history: "історична довідка",
  seo: "SEO",
  image: "зображення",
};

/**
 * "Церковний календар" AI preparation actions -- mirrors
 * features/telegram/content-plan/use-slot-actions.ts's own reasoning: every
 * `useMutation` call is written out directly (not behind a shared helper
 * function), since react-hooks/rules-of-hooks requires hooks to be called
 * only from a component or a `use*`-named function -- hoisting these into a
 * plain helper trips that lint rule even though the call order here is in
 * fact stable.
 *
 * A successful mutation patches the already-open form's fields directly
 * (`form.setValue`, not dirtying the form) rather than only invalidating
 * the query -- the admin is actively editing this same record, so the
 * fresh AI-generated content must appear immediately without discarding
 * any of their other unsaved edits.
 */
export function useCalendarAiActions(dayId: string | undefined, form: UseFormReturn<CalendarDayFormValues>): CalendarAiActions {
  const queryClient = useQueryClient();
  const id = dayId ?? "";
  const inFlight = useRef(false);
  const { isDirty } = form.formState;
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    if (inFlight.current) throw new Error("AI вже працює. Дочекайтеся завершення.");
    if (isDirty) throw new Error("Спочатку завершіть або скасуйте ручні зміни, потім запускайте AI.");
    inFlight.current = true;
    try { return await operation(); } finally { inFlight.current = false; }
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
  }
  function applyDay(day: CalendarDay, fields: CalendarAiField[] = ["description", "history", "seo", "image"]) {
    // Only touch generated fields, and never overwrite a manual edit made
    // while the request was in flight.
    const updates: Partial<CalendarDayFormValues> = {};
    if (fields.includes("description")) updates.shortDescription = day.shortDescription;
    if (fields.includes("history")) updates.history = day.history ?? "";
    if (fields.includes("seo")) { updates.seoTitle = day.seoTitle ?? null; updates.seoDescription = day.seoDescription ?? null; }
    if (fields.includes("image")) updates.imageId = day.imageId;
    for (const key of Object.keys(updates) as (keyof CalendarDayFormValues)[]) {
      if (!form.getFieldState(key).isDirty) form.setValue(key, updates[key]);
    }
    invalidate();
  }
  function onError(error: unknown) {
    toast.error(errorMessageFor(error));
  }

  // Published changes are reread through the same working-editor query.
  function handleAiWriteResult(result: CalendarAiWriteResult, field: CalendarAiField) {
    if (result.mode === "direct") {
      applyDay(result.day, [field]);
      toast.success(`Оновлено: ${FILL_FIELD_LABELS[field]}.`);
    } else {
      toast.success(`Підготовлено: ${FILL_FIELD_LABELS[field]}. Перевірте поля перед публікацією.`);
      invalidate();
    }
  }

  const generateDescription = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: () => run(() => apiClient.calendarDays.generateDescription(id)),
    onSuccess: (result) => handleAiWriteResult(result, "description"),
    onError,
  });
  const regenerateDescription = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: () => run(() => apiClient.calendarDays.regenerateDescription(id)),
    onSuccess: (result) => handleAiWriteResult(result, "description"),
    onError,
  });
  const generateHistory = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: () => run(() => apiClient.calendarDays.generateHistory(id)),
    onSuccess: (result) => handleAiWriteResult(result, "history"),
    onError,
  });
  const regenerateHistory = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: () => run(() => apiClient.calendarDays.regenerateHistory(id)),
    onSuccess: (result) => handleAiWriteResult(result, "history"),
    onError,
  });
  const generateSeo = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: () => run(() => apiClient.calendarDays.generateSeo(id)),
    onSuccess: (result) => handleAiWriteResult(result, "seo"),
    onError,
  });
  const regenerateSeo = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: () => run(() => apiClient.calendarDays.regenerateSeo(id)),
    onSuccess: (result) => handleAiWriteResult(result, "seo"),
    onError,
  });
  const generateImage = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: () => run(() => apiClient.calendarDays.generateImage(id)),
    onSuccess: (result) => handleAiWriteResult(result, "image"),
    onError,
  });
  const regenerateImage = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: () => run(() => apiClient.calendarDays.regenerateImage(id)),
    onSuccess: (result) => handleAiWriteResult(result, "image"),
    onError,
  });
  const assignImage = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: (imageUrl: string) => apiClient.calendarDays.assignImage(id, imageUrl),
    onSuccess: (day) => applyDay(day, ["image"]),
    onError,
  });
  const generateImageFromPrompt = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: (prompt: string) => run(() => apiClient.calendarDays.generateImageFromPrompt(id, prompt)),
    onSuccess: (result) => handleAiWriteResult(result, "image"),
    onError,
  });
  const fillMissing = useMutation({
    mutationKey: ["calendar-ai", id],
    mutationFn: () => run(() => apiClient.calendarDays.fillMissing(id)),
    onSuccess: (result) => {
      if (result.mode === "direct") {
        applyDay(result.day, result.filled);
        if (result.filled.length === 0) {
          if (!result.skipped.length) toast.success("Усе вже заповнено -- нема чого додавати з AI.");
        } else {
          toast.success(`Заповнено з AI: ${result.filled.map((f) => FILL_FIELD_LABELS[f]).join(", ")}.`);
        }
      } else {
        // Read back the server working copy, retaining its publication version.
        if (result.proposalId) {
          toast.success("AI заповнив робочу версію. Перевірте поля та натисніть «Опублікувати», коли все готово.");
          invalidate();
        } else {
          if (!result.skipped.length) toast.success("Усе вже заповнено -- нема чого додавати з AI.");
        }
      }
      if (result.skipped.length > 0) {
        for (const skipped of result.skipped) {
          const reason = skipped.reason === "failed"
            ? "генерація не завершилася. Перевірте підключення та ліміти API; повторіть лише відсутнє"
            : "потрібно перевірити джерело у Церковному календарі";
          toast.info(`${FILL_FIELD_LABELS[skipped.field]}: ${reason}.`);
        }
      }
    },
    onError,
  });

  function isPending(action: AiActionName): boolean {

    switch (action) {
      case "generateDescription":
        return generateDescription.isPending;
      case "regenerateDescription":
        return regenerateDescription.isPending;
      case "generateHistory":
        return generateHistory.isPending;
      case "regenerateHistory":
        return regenerateHistory.isPending;
      case "generateSeo":
        return generateSeo.isPending;
      case "regenerateSeo":
        return regenerateSeo.isPending;
      case "generateImage":
        return generateImage.isPending;
      case "regenerateImage":
        return regenerateImage.isPending;
      case "assignImage":
        return assignImage.isPending;
      case "generateImageFromPrompt":
        return generateImageFromPrompt.isPending;
      case "fillMissing":
        return fillMissing.isPending;
    }
  }

  return {
    generateDescription: () => generateDescription.mutate(),
    regenerateDescription: () => regenerateDescription.mutate(),
    generateHistory: () => generateHistory.mutate(),
    regenerateHistory: () => regenerateHistory.mutate(),
    generateSeo: () => generateSeo.mutate(),
    regenerateSeo: () => regenerateSeo.mutate(),
    generateImage: () => generateImage.mutate(),
    regenerateImage: () => regenerateImage.mutate(),
    assignImage: (imageUrl) => assignImage.mutate(imageUrl),
    generateImageFromPrompt: (prompt) => generateImageFromPrompt.mutate(prompt),
    fillMissing: () => fillMissing.mutate(),
    isBusy: generateDescription.isPending || regenerateDescription.isPending || generateHistory.isPending || regenerateHistory.isPending || generateSeo.isPending || regenerateSeo.isPending || generateImage.isPending || regenerateImage.isPending || generateImageFromPrompt.isPending || fillMissing.isPending,
    isPending,
  };
}
