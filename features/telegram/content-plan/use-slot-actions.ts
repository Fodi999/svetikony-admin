import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { AutopostContentType } from "@/types/entities";

type ActionName =
  | "generateText"
  | "regenerateText"
  | "editText"
  | "generateImage"
  | "regenerateImage"
  | "assignImage"
  | "removeImage"
  | "assignAudio"
  | "removeAudio"
  | "markReady"
  | "markUnready";

export type SlotActions = {
  generateText: (contentType: AutopostContentType) => void;
  regenerateText: (contentType: AutopostContentType) => void;
  editText: (contentType: AutopostContentType, text: string) => void;
  generateImage: (contentType: AutopostContentType) => void;
  regenerateImage: (contentType: AutopostContentType) => void;
  assignImage: (contentType: AutopostContentType, mediaUrl: string) => void;
  removeImage: (contentType: AutopostContentType) => void;
  assignAudio: (contentType: AutopostContentType, audioUrl: string) => void;
  removeAudio: (contentType: AutopostContentType) => void;
  markReady: (contentType: AutopostContentType) => void;
  markUnready: (contentType: AutopostContentType) => void;
  /** Which action is currently in flight for this specific content type,
   * if any -- each mutation instance is shared across all 5 SlotCards for
   * the day, so `isPending` alone would light up every card at once. */
  pendingAction: (contentType: AutopostContentType) => ActionName | null;
};

/**
 * One mutation per Content Plan Stage 2 slot action, shared by every
 * SlotCard in the open DayDrawer. Every mutation invalidates both the
 * year/month summary (`['telegram','contentPlan',year]`) and this day's
 * own detail (`['telegram','contentPlan','day',civilDate]`) on success --
 * the same "mutate, then invalidate, let the query refetch" pattern
 * autopost-tab.tsx's retry mutation already uses, rather than trying to
 * hand-patch cached state.
 *
 * Each of the 8 `useMutation` calls is written out directly (not behind a
 * shared helper function) -- react-hooks/rules-of-hooks requires hooks to
 * be called only from a component or a `use*`-named function, and hoisting
 * these into a plain helper trips that lint rule even though the call
 * order here is in fact stable.
 */
export function useSlotActions(civilDate: string, year: number): SlotActions {
  const queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["telegram", "contentPlan", year] });
    queryClient.invalidateQueries({ queryKey: ["telegram", "contentPlan", "day", civilDate] });
  }
  function onError(error: unknown) {
    toast.error(errorMessageFor(error));
  }

  const generateText = useMutation({
    mutationFn: (ct: AutopostContentType) => apiClient.telegram.contentPlan.generateText(civilDate, ct),
    onSuccess: invalidate,
    onError,
  });
  const regenerateText = useMutation({
    mutationFn: (ct: AutopostContentType) => apiClient.telegram.contentPlan.regenerateText(civilDate, ct),
    onSuccess: invalidate,
    onError,
  });
  const editText = useMutation({
    mutationFn: ([ct, text]: [AutopostContentType, string]) => apiClient.telegram.contentPlan.editText(civilDate, ct, text),
    onSuccess: invalidate,
    onError,
  });
  const generateImage = useMutation({
    mutationFn: (ct: AutopostContentType) => apiClient.telegram.contentPlan.generateImage(civilDate, ct),
    onSuccess: invalidate,
    onError,
  });
  const regenerateImage = useMutation({
    mutationFn: (ct: AutopostContentType) => apiClient.telegram.contentPlan.regenerateImage(civilDate, ct),
    onSuccess: invalidate,
    onError,
  });
  const assignImage = useMutation({
    mutationFn: ([ct, mediaUrl]: [AutopostContentType, string]) => apiClient.telegram.contentPlan.assignImage(civilDate, ct, mediaUrl),
    onSuccess: invalidate,
    onError,
  });
  const removeImage = useMutation({
    mutationFn: (ct: AutopostContentType) => apiClient.telegram.contentPlan.removeImage(civilDate, ct),
    onSuccess: invalidate,
    onError,
  });
  const assignAudio = useMutation({
    mutationFn: ([ct, audioUrl]: [AutopostContentType, string]) => apiClient.telegram.contentPlan.assignAudio(civilDate, ct, audioUrl),
    onSuccess: invalidate,
    onError,
  });
  const removeAudio = useMutation({
    mutationFn: (ct: AutopostContentType) => apiClient.telegram.contentPlan.removeAudio(civilDate, ct),
    onSuccess: invalidate,
    onError,
  });
  const markReady = useMutation({
    mutationFn: (ct: AutopostContentType) => apiClient.telegram.contentPlan.markReady(civilDate, ct),
    onSuccess: invalidate,
    onError,
  });
  const markUnready = useMutation({
    mutationFn: (ct: AutopostContentType) => apiClient.telegram.contentPlan.markUnready(civilDate, ct),
    onSuccess: invalidate,
    onError,
  });

  function pendingAction(contentType: AutopostContentType): ActionName | null {
    if (generateText.isPending && generateText.variables === contentType) return "generateText";
    if (regenerateText.isPending && regenerateText.variables === contentType) return "regenerateText";
    if (editText.isPending && editText.variables?.[0] === contentType) return "editText";
    if (generateImage.isPending && generateImage.variables === contentType) return "generateImage";
    if (regenerateImage.isPending && regenerateImage.variables === contentType) return "regenerateImage";
    if (assignImage.isPending && assignImage.variables?.[0] === contentType) return "assignImage";
    if (removeImage.isPending && removeImage.variables === contentType) return "removeImage";
    if (assignAudio.isPending && assignAudio.variables?.[0] === contentType) return "assignAudio";
    if (removeAudio.isPending && removeAudio.variables === contentType) return "removeAudio";
    if (markReady.isPending && markReady.variables === contentType) return "markReady";
    if (markUnready.isPending && markUnready.variables === contentType) return "markUnready";
    return null;
  }

  return {
    generateText: (ct) => generateText.mutate(ct),
    regenerateText: (ct) => regenerateText.mutate(ct),
    editText: (ct, text) => editText.mutate([ct, text]),
    generateImage: (ct) => generateImage.mutate(ct),
    regenerateImage: (ct) => regenerateImage.mutate(ct),
    assignImage: (ct, mediaUrl) => assignImage.mutate([ct, mediaUrl]),
    removeImage: (ct) => removeImage.mutate(ct),
    assignAudio: (ct, audioUrl) => assignAudio.mutate([ct, audioUrl]),
    removeAudio: (ct) => removeAudio.mutate(ct),
    markReady: (ct) => markReady.mutate(ct),
    markUnready: (ct) => markUnready.mutate(ct),
    pendingAction,
  };
}
