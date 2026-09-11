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

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
  }
  function applyDay(day: CalendarDay) {
    form.setValue("shortDescription", day.shortDescription);
    form.setValue("history", day.history ?? "");
    form.setValue("seoTitle", day.seoTitle ?? null);
    form.setValue("seoDescription", day.seoDescription ?? null);
    form.setValue("imageId", day.imageId);
    invalidate();
  }
  function onError(error: unknown) {
    toast.error(errorMessageFor(error));
  }

  /**
   * Shared onSuccess for every generate/regenerate action: a DRAFT day
   * was written directly, so patch the open form's fields as before
   * (`applyDay`). A PUBLISHED day was never touched -- the same generated
   * value instead became a pending AI proposal; the form must NOT be
   * patched (it would show content the record doesn't actually have yet),
   * and the proposal panel's query is invalidated so the new pending
   * proposal appears there for review.
   */
  function handleAiWriteResult(result: CalendarAiWriteResult, field: CalendarAiField) {
    if (result.mode === "direct") {
      applyDay(result.day);
      toast.success(`Оновлено: ${FILL_FIELD_LABELS[field]}.`);
    } else {
      toast.success(`Опубліковано: створено пропозицію AI (${FILL_FIELD_LABELS[field]}) на розгляд адміністратора.`);
      queryClient.invalidateQueries({ queryKey: ["ai-proposals"] });
    }
  }

  const generateDescription = useMutation({
    mutationFn: () => apiClient.calendarDays.generateDescription(id),
    onSuccess: (result) => handleAiWriteResult(result, "description"),
    onError,
  });
  const regenerateDescription = useMutation({
    mutationFn: () => apiClient.calendarDays.regenerateDescription(id),
    onSuccess: (result) => handleAiWriteResult(result, "description"),
    onError,
  });
  const generateHistory = useMutation({
    mutationFn: () => apiClient.calendarDays.generateHistory(id),
    onSuccess: (result) => handleAiWriteResult(result, "history"),
    onError,
  });
  const regenerateHistory = useMutation({
    mutationFn: () => apiClient.calendarDays.regenerateHistory(id),
    onSuccess: (result) => handleAiWriteResult(result, "history"),
    onError,
  });
  const generateSeo = useMutation({
    mutationFn: () => apiClient.calendarDays.generateSeo(id),
    onSuccess: (result) => handleAiWriteResult(result, "seo"),
    onError,
  });
  const regenerateSeo = useMutation({
    mutationFn: () => apiClient.calendarDays.regenerateSeo(id),
    onSuccess: (result) => handleAiWriteResult(result, "seo"),
    onError,
  });
  const generateImage = useMutation({
    mutationFn: () => apiClient.calendarDays.generateImage(id),
    onSuccess: (result) => handleAiWriteResult(result, "image"),
    onError,
  });
  const regenerateImage = useMutation({
    mutationFn: () => apiClient.calendarDays.regenerateImage(id),
    onSuccess: (result) => handleAiWriteResult(result, "image"),
    onError,
  });
  const assignImage = useMutation({
    mutationFn: (imageUrl: string) => apiClient.calendarDays.assignImage(id, imageUrl),
    onSuccess: applyDay,
    onError,
  });
  const generateImageFromPrompt = useMutation({
    mutationFn: (prompt: string) => apiClient.calendarDays.generateImageFromPrompt(id, prompt),
    onSuccess: (result) => handleAiWriteResult(result, "image"),
    onError,
  });
  const fillMissing = useMutation({
    mutationFn: () => apiClient.calendarDays.fillMissing(id),
    onSuccess: (result) => {
      if (result.mode === "direct") {
        applyDay(result.day);
        if (result.filled.length === 0) {
          toast.success("Усе вже заповнено -- нема чого додавати з AI.");
        } else {
          toast.success(`Заповнено з AI: ${result.filled.map((f) => FILL_FIELD_LABELS[f]).join(", ")}.`);
        }
      } else {
        // PUBLISHED day -- nothing was written. A pending proposal (if any)
        // now exists for a human to review in the proposal panel; never
        // patch the open form's fields here, since the record itself is
        // unchanged.
        if (result.proposalId) {
          toast.success("Опубліковано: створено пропозицію AI на розгляд адміністратора (нічого не змінено напряму).");
          queryClient.invalidateQueries({ queryKey: ["ai-proposals"] });
        } else {
          toast.success("Усе вже заповнено -- нема чого пропонувати.");
        }
      }
      if (result.skipped.length > 0) {
        toast.info("Потрібно виправити джерело у Церковному календарі, щоб заповнити решту.");
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
    isPending,
  };
}
