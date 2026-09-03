"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageOff, Music, Music2 } from "lucide-react";
import { StateMessage } from "@/components/feedback/state-message";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  /** Which Media Library kind to list/pick -- "image" renders the existing
   * thumbnail grid, "audio" renders a file list (no meaningful thumbnail
   * for an audio object). Defaults to "image" so every pre-existing call
   * site (the photo picker) keeps its exact previous behavior unchanged. */
  kind?: "image" | "audio";
}

function fileNameFromKey(key: string): string {
  return key.split("/").pop() ?? key;
}

/** "Обрати з медіатеки" — lists real R2 objects under the `telegram` module
 * (see ApiClient.media.listObjects). Falls back to an explanatory empty
 * state rather than crashing if the current adapter doesn't implement it
 * (MockApiAdapter's media.listObjects is optional). */
export function MediaPickerDialog({ open, onOpenChange, onSelect, kind = "image" }: MediaPickerDialogProps) {
  const query = useQuery({
    queryKey: ["media", "telegram"],
    queryFn: () => apiClient.media.listObjects?.({ module: "telegram" }) ?? Promise.resolve({ items: [], cursor: null }),
    enabled: open,
  });

  const items = query.data?.items.filter((item) => item.kind === kind) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{kind === "audio" ? "Обрати аудіо" : "Обрати зображення"}</DialogTitle>
        </DialogHeader>

        {query.isLoading ? (
          <div className={kind === "audio" ? "space-y-2" : "grid grid-cols-3 gap-3 sm:grid-cols-4"}>
            {Array.from({ length: kind === "audio" ? 4 : 8 }).map((_, i) => (
              <Skeleton key={i} className={kind === "audio" ? "h-10 w-full rounded-md" : "aspect-square rounded-lg"} />
            ))}
          </div>
        ) : query.isError ? (
          <StateMessage variant="error" title="Не вдалося завантажити медіатеку" description={errorMessageFor(query.error)} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            {kind === "audio" ? <Music className="size-8" aria-hidden /> : <ImageOff className="size-8" aria-hidden />}
            <p className="text-sm">{kind === "audio" ? "Ще немає завантажених аудіофайлів для Telegram." : "Ще немає завантажених зображень для Telegram."}</p>
          </div>
        ) : kind === "audio" ? (
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  onSelect(item.url);
                  onOpenChange(false);
                }}
              >
                <Music2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{fileNameFromKey(item.key)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className="aspect-square overflow-hidden rounded-lg border transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  onSelect(item.url);
                  onOpenChange(false);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary R2-hosted images, next/image's remote-pattern allowlist isn't set up for this module */}
                <img src={item.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
