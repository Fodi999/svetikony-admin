"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AUTOPOST_CONTENT_TYPE_LABELS, type AutopostContentType, type ContentPlanSlot } from "@/types/entities";

function MessageBubble({ children }: { children: React.ReactNode }) {
  return <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">{children}</div>;
}

/**
 * Renders exactly what production delivery would send, using
 * `deliveryPreview` (computed server-side via the real `planDelivery()` --
 * see lib/telegram/content-plan.ts in svet-ikony) rather than
 * reimplementing the caption-length/linked-caption logic here.
 */
export function PreviewDialog({
  open,
  onOpenChange,
  contentType,
  slot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: AutopostContentType;
  slot: ContentPlanSlot;
}) {
  const preview = slot.deliveryPreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Попередній перегляд у Telegram — {AUTOPOST_CONTENT_TYPE_LABELS[contentType]}</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <p className="text-sm text-muted-foreground">Немає тексту для попереднього перегляду.</p>
        ) : (
          <div className="space-y-3">
            {slot.imageUrl ? (
              <div className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slot.imageUrl} alt="" className="w-full rounded-lg border object-cover" />
                {preview.kind === "photo_with_caption" ? <MessageBubble>{slot.fullText}</MessageBubble> : null}
                {(preview.kind === "photo_then_text" || preview.kind === "photo_and_audio_then_text") && preview.photoCaption ? (
                  <MessageBubble>{preview.photoCaption}</MessageBubble>
                ) : null}
              </div>
            ) : null}

            {slot.audioUrl && (preview.kind === "audio_then_text" || preview.kind === "photo_and_audio_then_text") ? (
              <div className="space-y-1">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption -- spoken-word church audio, no captioning pipeline exists */}
                <audio controls src={slot.audioUrl} className="h-8 w-full" />
                {preview.audioCaption ? <MessageBubble>{preview.audioCaption}</MessageBubble> : null}
              </div>
            ) : null}

            {preview.kind === "text_only" ||
            preview.kind === "photo_then_text" ||
            preview.kind === "audio_then_text" ||
            preview.kind === "photo_and_audio_then_text" ? (
              <MessageBubble>{slot.fullText}</MessageBubble>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {preview.kind === "text_only" && "Одне текстове повідомлення (без фото й аудіо)."}
              {preview.kind === "photo_with_caption" && "Одне повідомлення: фото з повним текстом як підписом."}
              {preview.kind === "photo_then_text" && "Два повідомлення: фото з коротким підписом, потім повний текст окремо."}
              {preview.kind === "audio_then_text" && "Два повідомлення: аудіо з коротким підписом, потім повний текст окремо."}
              {preview.kind === "photo_and_audio_then_text" && "Три повідомлення: фото, аудіо, потім повний текст окремо."}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
