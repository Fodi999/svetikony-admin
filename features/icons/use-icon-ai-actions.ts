import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { IconFormValues } from "@/lib/validation/icon.schema";
import type { Icon, IconAiField, IconAiWriteResult } from "@/types/entities";

type AiActionName =
  | "generateDescription"
  | "regenerateDescription"
  | "generateHistory"
  | "regenerateHistory"
  | "generateSaintImageDescription"
  | "regenerateSaintImageDescription"
  | "fillMissing";

export type IconAiActions = {
  generateDescription: () => void;
  regenerateDescription: () => void;
  generateHistory: () => void;
  regenerateHistory: () => void;
  generateSaintImageDescription: () => void;
  regenerateSaintImageDescription: () => void;
  fillMissing: () => void;
  isBusy: boolean;
  isPending: (action: AiActionName) => boolean;
};

const FILL_FIELD_LABELS: Record<IconAiField, string> = {
  description: "опис",
  history: "історична довідка",
  saintImageDescription: "опис образу святого",
};

/**
 * "Ікони" AI preparation actions -- mirrors
 * features/calendar/use-calendar-ai-actions.ts's own reasoning exactly
 * (every `useMutation` written out directly, not behind a shared helper,
 * since react-hooks/rules-of-hooks requires hooks to be called only from
 * a component or a `use*`-named function). No image-related action here
 * yet -- icons have no AI-generated photo pipeline (that's a separate,
 * later phase); this only ever touches description/history/
 * saintImageDescription.
 *
 * A successful mutation patches the already-open form's fields directly
 * (`form.setValue`, not dirtying the form) rather than only invalidating
 * the query -- the admin is actively editing this same record, so the
 * fresh AI-generated content must appear immediately without discarding
 * any of their other unsaved edits.
 */
export function useIconAiActions(iconId: string | undefined, form: UseFormReturn<IconFormValues>): IconAiActions {
  const queryClient = useQueryClient();
  const id = iconId ?? "";
  const inFlight = useRef(false);
  const { isDirty } = form.formState;
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    if (inFlight.current) throw new Error("AI вже працює. Дочекайтеся завершення.");
    if (isDirty) throw new Error("Спочатку завершіть або скасуйте ручні зміни, потім запускайте AI.");
    inFlight.current = true;
    try { return await operation(); } finally { inFlight.current = false; }
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["icons"] });
  }
  function applyIcon(icon: Icon, fields: IconAiField[]) {
    // Only touch generated fields, and never overwrite a manual edit made
    // while the request was in flight.
    const updates: Partial<IconFormValues> = {};
    if (fields.includes("description")) updates.description = icon.description;
    if (fields.includes("history")) updates.history = icon.history ?? "";
    if (fields.includes("saintImageDescription")) updates.saintImageDescription = icon.saintImageDescription ?? "";
    for (const key of Object.keys(updates) as (keyof IconFormValues)[]) {
      if (!form.getFieldState(key).isDirty) form.setValue(key, updates[key]);
    }
    invalidate();
  }
  function onError(error: unknown) {
    toast.error(errorMessageFor(error));
  }

  function handleAiWriteResult(result: IconAiWriteResult, field: IconAiField) {
    if (result.mode === "direct") {
      applyIcon(result.icon, [field]);
      toast.success(`Оновлено: ${FILL_FIELD_LABELS[field]}.`);
    } else {
      toast.success(`Підготовлено: ${FILL_FIELD_LABELS[field]}. Перевірте поля перед публікацією.`);
      invalidate();
    }
  }

  const generateDescription = useMutation({
    mutationKey: ["icon-ai", id],
    mutationFn: () => run(() => apiClient.icons.generateDescription(id)),
    onSuccess: (result) => handleAiWriteResult(result, "description"),
    onError,
  });
  const regenerateDescription = useMutation({
    mutationKey: ["icon-ai", id],
    mutationFn: () => run(() => apiClient.icons.regenerateDescription(id)),
    onSuccess: (result) => handleAiWriteResult(result, "description"),
    onError,
  });
  const generateHistory = useMutation({
    mutationKey: ["icon-ai", id],
    mutationFn: () => run(() => apiClient.icons.generateHistory(id)),
    onSuccess: (result) => handleAiWriteResult(result, "history"),
    onError,
  });
  const regenerateHistory = useMutation({
    mutationKey: ["icon-ai", id],
    mutationFn: () => run(() => apiClient.icons.regenerateHistory(id)),
    onSuccess: (result) => handleAiWriteResult(result, "history"),
    onError,
  });
  const generateSaintImageDescription = useMutation({
    mutationKey: ["icon-ai", id],
    mutationFn: () => run(() => apiClient.icons.generateSaintImageDescription(id)),
    onSuccess: (result) => handleAiWriteResult(result, "saintImageDescription"),
    onError,
  });
  const regenerateSaintImageDescription = useMutation({
    mutationKey: ["icon-ai", id],
    mutationFn: () => run(() => apiClient.icons.regenerateSaintImageDescription(id)),
    onSuccess: (result) => handleAiWriteResult(result, "saintImageDescription"),
    onError,
  });
  const fillMissing = useMutation({
    mutationKey: ["icon-ai", id],
    mutationFn: () => run(() => apiClient.icons.fillMissing(id)),
    onSuccess: (result) => {
      if (result.mode === "direct") {
        applyIcon(result.icon, result.filled);
        if (result.filled.length === 0) {
          if (!result.skipped.length) toast.success("Усе вже заповнено -- нема чого додавати з AI.");
        } else {
          toast.success(`Заповнено з AI: ${result.filled.map((f) => FILL_FIELD_LABELS[f]).join(", ")}.`);
        }
      } else {
        if (result.proposalId) {
          toast.success("AI заповнив робочу версію. Перевірте поля та натисніть «Опублікувати», коли все готово.");
          invalidate();
        } else {
          if (!result.skipped.length) toast.success("Усе вже заповнено -- нема чого додавати з AI.");
        }
      }
      if (result.skipped.length > 0) {
        for (const skipped of result.skipped) {
          toast.info(`${FILL_FIELD_LABELS[skipped.field]}: генерація не завершилася. Перевірте підключення та ліміти API; повторіть лише відсутнє.`);
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
      case "generateSaintImageDescription":
        return generateSaintImageDescription.isPending;
      case "regenerateSaintImageDescription":
        return regenerateSaintImageDescription.isPending;
      case "fillMissing":
        return fillMissing.isPending;
    }
  }

  return {
    generateDescription: () => generateDescription.mutate(),
    regenerateDescription: () => regenerateDescription.mutate(),
    generateHistory: () => generateHistory.mutate(),
    regenerateHistory: () => regenerateHistory.mutate(),
    generateSaintImageDescription: () => generateSaintImageDescription.mutate(),
    regenerateSaintImageDescription: () => regenerateSaintImageDescription.mutate(),
    fillMissing: () => fillMissing.mutate(),
    isBusy:
      generateDescription.isPending ||
      regenerateDescription.isPending ||
      generateHistory.isPending ||
      regenerateHistory.isPending ||
      generateSaintImageDescription.isPending ||
      regenerateSaintImageDescription.isPending ||
      fillMissing.isPending,
    isPending,
  };
}
