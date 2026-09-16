import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { ProductFormValues } from "@/lib/validation/product.schema";
import type { Language, ProductAiField, ProductAiWriteResult } from "@/types/entities";

type AiActionName =
  | "generateFullDescription"
  | "regenerateFullDescription"
  | "generateSeoTitle"
  | "regenerateSeoTitle"
  | "generateSeoDescription"
  | "regenerateSeoDescription"
  | "fillMissing";

export type ProductAiActions = {
  generateFullDescription: () => void;
  regenerateFullDescription: () => void;
  generateSeoTitle: () => void;
  regenerateSeoTitle: () => void;
  generateSeoDescription: () => void;
  regenerateSeoDescription: () => void;
  fillMissing: () => void;
  isBusy: boolean;
  isPending: (action: AiActionName) => boolean;
};

const FIELD_LABELS: Record<ProductAiField, string> = {
  fullDescription: "повний опис",
  seoTitle: "SEO-заголовок",
  seoDescription: "SEO-опис",
};
const LANGUAGE_LABELS: Record<Language, string> = { uk: "укр.", ru: "рос.", en: "англ." };

/**
 * "Товари" AI shop-copy actions -- mirrors features/icons/use-icon-ai-actions.ts's
 * own reasoning (every `useMutation` written out directly, not behind a
 * shared helper, since react-hooks/rules-of-hooks requires hooks to be
 * called only from a component or a `use*`-named function), adapted for
 * icon_order_options' one-row-holds-all-3-languages shape: every
 * per-field action takes the CURRENTLY ACTIVE translation tab's language
 * (passed in as `language`, re-evaluated by the caller on every render),
 * while fillMissing() spans all three languages in a single call and
 * patches whichever tabs it filled regardless of which one is visible.
 *
 * A successful mutation patches the already-open form's fields directly
 * (`form.setValue`, not dirtying the form) rather than only invalidating
 * the query -- same reasoning as use-icon-ai-actions.ts's applyIcon().
 */
export function useProductAiActions(productId: string | undefined, form: UseFormReturn<ProductFormValues>, language: Language): ProductAiActions {
  const queryClient = useQueryClient();
  const id = productId ?? "";
  const inFlight = useRef(false);
  const { isDirty } = form.formState;

  async function run<T>(operation: () => Promise<T>): Promise<T> {
    if (inFlight.current) throw new Error("AI вже працює. Дочекайтеся завершення.");
    if (isDirty) throw new Error("Спочатку завершіть або скасуйте ручні зміни, потім запускайте AI.");
    inFlight.current = true;
    try {
      return await operation();
    } finally {
      inFlight.current = false;
    }
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  function applyField(lang: Language, field: ProductAiField, value: string) {
    const path = `translations.${lang}.${field}` as const;
    if (!form.getFieldState(path).isDirty) form.setValue(path, value);
  }

  function handleWriteResult(result: ProductAiWriteResult, lang: Language, field: ProductAiField) {
    if (result.mode === "direct") {
      applyField(lang, field, result.product.translations[lang][field]);
      toast.success(`Оновлено: ${FIELD_LABELS[field]} (${LANGUAGE_LABELS[lang]}).`);
      invalidate();
    } else {
      toast.success(`Підготовлено: ${FIELD_LABELS[field]} (${LANGUAGE_LABELS[lang]}). Перевірте пропозицію перед публікацією.`);
      invalidate();
    }
  }
  function onError(error: unknown) {
    toast.error(errorMessageFor(error));
  }

  const generateFullDescription = useMutation({
    mutationKey: ["product-ai", id, "fullDescription", language],
    mutationFn: () => run(() => apiClient.products.generateFullDescription(id, language)),
    onSuccess: (result) => handleWriteResult(result, language, "fullDescription"),
    onError,
  });
  const regenerateFullDescription = useMutation({
    mutationKey: ["product-ai", id, "fullDescription", language],
    mutationFn: () => run(() => apiClient.products.regenerateFullDescription(id, language)),
    onSuccess: (result) => handleWriteResult(result, language, "fullDescription"),
    onError,
  });
  const generateSeoTitle = useMutation({
    mutationKey: ["product-ai", id, "seoTitle", language],
    mutationFn: () => run(() => apiClient.products.generateSeoTitle(id, language)),
    onSuccess: (result) => handleWriteResult(result, language, "seoTitle"),
    onError,
  });
  const regenerateSeoTitle = useMutation({
    mutationKey: ["product-ai", id, "seoTitle", language],
    mutationFn: () => run(() => apiClient.products.regenerateSeoTitle(id, language)),
    onSuccess: (result) => handleWriteResult(result, language, "seoTitle"),
    onError,
  });
  const generateSeoDescription = useMutation({
    mutationKey: ["product-ai", id, "seoDescription", language],
    mutationFn: () => run(() => apiClient.products.generateSeoDescription(id, language)),
    onSuccess: (result) => handleWriteResult(result, language, "seoDescription"),
    onError,
  });
  const regenerateSeoDescription = useMutation({
    mutationKey: ["product-ai", id, "seoDescription", language],
    mutationFn: () => run(() => apiClient.products.regenerateSeoDescription(id, language)),
    onSuccess: (result) => handleWriteResult(result, language, "seoDescription"),
    onError,
  });
  const fillMissing = useMutation({
    mutationKey: ["product-ai", id, "fill-missing"],
    mutationFn: () => run(() => apiClient.products.fillMissing(id)),
    onSuccess: (result) => {
      if (result.mode === "direct") {
        for (const { language: lang, field } of result.filled) applyField(lang, field, result.product.translations[lang][field]);
        if (result.filled.length === 0) {
          if (!result.skipped.length) toast.success("Усе вже заповнено -- нема чого додавати з AI.");
        } else {
          toast.success(`Заповнено з AI: ${result.filled.length} пол${result.filled.length === 1 ? "е" : "я"}.`);
        }
      } else {
        if (result.proposalId) {
          toast.success("AI заповнив пропозицію. Перевірте поля та підтвердіть перед публікацією.");
        } else if (!result.skipped.length) {
          toast.success("Усе вже заповнено -- нема чого додавати з AI.");
        }
      }
      if (result.skipped.length > 0) {
        for (const skip of result.skipped) {
          toast.info(`${FIELD_LABELS[skip.field]} (${LANGUAGE_LABELS[skip.language]}): генерація не завершилася. Спробуйте ще раз пізніше.`);
        }
      }
      invalidate();
    },
    onError,
  });

  function isPending(action: AiActionName): boolean {
    switch (action) {
      case "generateFullDescription":
        return generateFullDescription.isPending;
      case "regenerateFullDescription":
        return regenerateFullDescription.isPending;
      case "generateSeoTitle":
        return generateSeoTitle.isPending;
      case "regenerateSeoTitle":
        return regenerateSeoTitle.isPending;
      case "generateSeoDescription":
        return generateSeoDescription.isPending;
      case "regenerateSeoDescription":
        return regenerateSeoDescription.isPending;
      case "fillMissing":
        return fillMissing.isPending;
    }
  }

  return {
    generateFullDescription: () => generateFullDescription.mutate(),
    regenerateFullDescription: () => regenerateFullDescription.mutate(),
    generateSeoTitle: () => generateSeoTitle.mutate(),
    regenerateSeoTitle: () => regenerateSeoTitle.mutate(),
    generateSeoDescription: () => generateSeoDescription.mutate(),
    regenerateSeoDescription: () => regenerateSeoDescription.mutate(),
    fillMissing: () => fillMissing.mutate(),
    isBusy:
      generateFullDescription.isPending ||
      regenerateFullDescription.isPending ||
      generateSeoTitle.isPending ||
      regenerateSeoTitle.isPending ||
      generateSeoDescription.isPending ||
      regenerateSeoDescription.isPending ||
      fillMissing.isPending,
    isPending,
  };
}
