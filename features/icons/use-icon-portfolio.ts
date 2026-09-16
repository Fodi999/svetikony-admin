import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { IconFormValues } from "@/lib/validation/icon.schema";
import type { GeneratedIconPortfolioPhoto, IconPortfolioPreset } from "@/types/entities";

const PRESET_LABELS: Record<IconPortfolioPreset, string> = {
  table_candle: "На столі зі свічкою",
  in_hand: "В руках",
  framed_wall: "У рамці на стіні",
};

export type IconPortfolioState = {
  /** Freshly generated candidates awaiting admin review -- NOT yet part of
   * the icon's gallery; empty once confirmed or cancelled. */
  candidates: GeneratedIconPortfolioPhoto[];
  isSelected: (imageUrl: string) => boolean;
  isGenerating: boolean;
  isConfirming: boolean;
  presetLabel: (preset: IconPortfolioPreset) => string;
  generate: () => void;
  toggle: (imageUrl: string) => void;
  confirm: () => void;
  cancel: () => void;
};

/**
 * "Медіа" tab portfolio generation -- a review-then-confirm flow, distinct
 * from use-icon-ai-actions.ts's text fields: generate() only stages
 * candidates locally (the Worker already stored them to R2, but never
 * touched the icon's own row -- see generateIconPortfolio()'s own doc
 * comment in svet-ikony), and nothing reaches this icon's public gallery
 * until confirm() explicitly says so. A DRAFT icon's confirm patches the
 * form's galleryImageIds directly (same "never overwrite a manual edit
 * made while the request was in flight" guard as applyIcon() in
 * use-icon-ai-actions.ts); a PUBLISHED icon's confirm leaves the record
 * untouched and stages a human-authored proposal instead.
 */
export function useIconPortfolio(iconId: string | undefined, form: UseFormReturn<IconFormValues>): IconPortfolioState {
  const queryClient = useQueryClient();
  const id = iconId ?? "";
  const [candidates, setCandidates] = useState<GeneratedIconPortfolioPhoto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["icons"] });
  }
  function reset() {
    setCandidates([]);
    setSelected(new Set());
  }

  const generateMutation = useMutation({
    mutationFn: () => apiClient.icons.generatePortfolio(id),
    onSuccess: (result) => {
      setCandidates(result.generated);
      setSelected(new Set(result.generated.map((c) => c.imageUrl)));
      if (result.generated.length === 0) {
        toast.error("Не вдалося згенерувати жодного фото. Спробуйте пізніше.");
      } else if (result.skipped.length > 0) {
        toast.info(`Згенеровано ${result.generated.length} із ${result.generated.length + result.skipped.length}. Частина спроб не вдалася.`);
      }
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const confirmMutation = useMutation({
    mutationFn: (images: GeneratedIconPortfolioPhoto[]) => apiClient.icons.addPortfolioImages(id, images),
    onSuccess: (result) => {
      reset();
      if (result.mode === "direct") {
        if (!form.getFieldState("galleryImageIds").isDirty) form.setValue("galleryImageIds", result.icon.galleryImageIds);
        toast.success("Фото портфоліо додано до галереї.");
      } else {
        toast.success("AI-фото підготовлено як пропозицію. Перевірте її перед публікацією.");
      }
      invalidate();
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return {
    candidates,
    isSelected: (imageUrl) => selected.has(imageUrl),
    isGenerating: generateMutation.isPending,
    isConfirming: confirmMutation.isPending,
    presetLabel: (preset) => PRESET_LABELS[preset] ?? preset,
    generate: () => {
      if (!id) {
        toast.error("Спочатку збережіть ікону.");
        return;
      }
      reset();
      generateMutation.mutate();
    },
    toggle: (imageUrl) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(imageUrl)) next.delete(imageUrl);
        else next.add(imageUrl);
        return next;
      });
    },
    confirm: () => {
      const chosen = candidates.filter((c) => selected.has(c.imageUrl));
      if (chosen.length === 0) {
        toast.error("Оберіть хоча б одне фото.");
        return;
      }
      confirmMutation.mutate(chosen);
    },
    cancel: reset,
  };
}
