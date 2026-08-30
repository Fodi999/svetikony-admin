"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { StateMessage } from "@/components/feedback/state-message";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

/** "Обрати з медіатеки" — lists real R2 objects under the `telegram` module
 * (see ApiClient.media.listObjects). Falls back to an explanatory empty
 * state rather than crashing if the current adapter doesn't implement it
 * (MockApiAdapter's media.listObjects is optional). */
export function MediaPickerDialog({ open, onOpenChange, onSelect }: MediaPickerDialogProps) {
  const query = useQuery({
    queryKey: ["media", "telegram"],
    queryFn: () => apiClient.media.listObjects?.({ module: "telegram" }) ?? Promise.resolve({ items: [], cursor: null }),
    enabled: open,
  });

  const items = query.data?.items.filter((item) => item.kind === "image") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Обрати зображення</DialogTitle>
        </DialogHeader>

        {query.isLoading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <StateMessage variant="error" title="Не вдалося завантажити медіатеку" description={errorMessageFor(query.error)} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <ImageOff className="size-8" aria-hidden />
            <p className="text-sm">Ще немає завантажених зображень для Telegram.</p>
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
