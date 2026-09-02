"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaPickerDialog } from "../media-picker-dialog";
import { AUTOPOST_CONTENT_TYPE_LABELS, type ContentPlanSlot } from "@/types/entities";
import { PreviewDialog } from "./preview-dialog";
import { StatusBadge } from "./status-badge";
import { TextEditorDialog } from "./text-editor-dialog";
import type { SlotActions } from "./use-slot-actions";

const SOURCE_STATUS_LABELS: Record<ContentPlanSlot["sourceStatus"], string> = {
  available: "Є джерело",
  missing_source: "Немає джерела",
  insufficient_data: "Немає джерела",
};

const VERIFICATION_LABELS: Record<"verified" | "failed", string> = {
  verified: "Перевірено",
  failed: "Не пройшла перевірку",
};

function formatSentAt(sentAt: string): string {
  return new Date(sentAt).toLocaleString("uk-UA");
}

/** No actions at all for a slot that can't be acted on yet/anymore --
 * matches the task's own "REVIEW_REQUIRED buttons disabled" /
 * "MISSING_SOURCE buttons disabled" / "SENT immutable" requirements by
 * simply not rendering any action in these states, rather than rendering
 * disabled buttons with no obvious next step. */
const NO_ACTIONS_STATUSES = new Set<ContentPlanSlot["publicationStatus"]>(["SENT", "REVIEW_REQUIRED", "MISSING_SOURCE"]);

export function SlotCard({ slot, actions }: { slot: ContentPlanSlot; actions: SlotActions }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [confirmRegenerateText, setConfirmRegenerateText] = useState(false);
  const [confirmRegenerateImage, setConfirmRegenerateImage] = useState(false);

  const pending = actions.pendingAction(slot.contentType);
  const hasActions = !NO_ACTIONS_STATUSES.has(slot.publicationStatus);
  const isReady = slot.publicationStatus === "READY";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {slot.scheduledTime} — {AUTOPOST_CONTENT_TYPE_LABELS[slot.contentType]}
        </CardTitle>
        <StatusBadge status={slot.publicationStatus} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Джерело: {SOURCE_STATUS_LABELS[slot.sourceStatus]}</span>
          {slot.verificationStatus ? <span>Перевірка: {VERIFICATION_LABELS[slot.verificationStatus]}</span> : null}
          <span>Текст: {slot.textAvailable ? "є" : "немає"}</span>
          <span>Фото: {slot.imageAvailable ? "є" : "немає"}</span>
        </div>

        {slot.publicationStatus === "REVIEW_REQUIRED" ? (
          <p className="text-sm text-orange-400">Потрібна перевірка календаря</p>
        ) : null}

        {slot.publicationStatus === "MISSING_SOURCE" ? <p className="text-sm text-muted-foreground">Немає джерела</p> : null}

        {slot.textPreview ? <p className="whitespace-pre-wrap text-sm text-foreground/90">{slot.textPreview}…</p> : null}

        {slot.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slot.imageUrl} alt="" className="h-24 w-full rounded-md border object-cover" />
        ) : null}

        {slot.errorMessage ? <p className="text-xs text-destructive">{slot.errorMessage}</p> : null}

        {slot.publicationStatus === "SENT" ? (
          <p className="text-xs text-muted-foreground">
            {slot.telegramMessageId ? `Message ID: ${slot.telegramMessageId}` : null}
            {slot.telegramMessageId && slot.sentAt ? " · " : null}
            {slot.sentAt ? formatSentAt(slot.sentAt) : null}
          </p>
        ) : null}

        {hasActions ? (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex flex-wrap gap-2">
              {!slot.textAvailable ? (
                <Button size="sm" variant="outline" disabled={!!pending} onClick={() => actions.generateText(slot.contentType)}>
                  {pending === "generateText" ? "Генерація…" : "Згенерувати текст"}
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" disabled={!!pending} onClick={() => setEditorOpen(true)}>
                    Редагувати
                  </Button>
                  <Button size="sm" variant="outline" disabled={!!pending} onClick={() => setConfirmRegenerateText(true)}>
                    {pending === "regenerateText" ? "Регенерація…" : "Перегенерувати текст"}
                  </Button>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {!slot.imageAvailable ? (
                <Button size="sm" variant="outline" disabled={!!pending} onClick={() => actions.generateImage(slot.contentType)}>
                  {pending === "generateImage" ? "Генерація…" : "Згенерувати фото"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={!!pending} onClick={() => setConfirmRegenerateImage(true)}>
                  {pending === "regenerateImage" ? "Регенерація…" : "Перегенерувати фото"}
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={!!pending} onClick={() => setMediaPickerOpen(true)}>
                Обрати з медіатеки
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {slot.textAvailable ? (
                <Button size="sm" variant="ghost" disabled={!!pending} onClick={() => setPreviewOpen(true)}>
                  Перегляд
                </Button>
              ) : null}
              {slot.textAvailable && !isReady ? (
                <Button size="sm" disabled={!!pending} onClick={() => actions.markReady(slot.contentType)}>
                  {pending === "markReady" ? "Збереження…" : "Позначити готовим"}
                </Button>
              ) : null}
              {isReady ? (
                <Button size="sm" variant="secondary" disabled={!!pending} onClick={() => actions.markUnready(slot.contentType)}>
                  {pending === "markUnready" ? "Збереження…" : "Зняти з готовності"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>

      <TextEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        contentType={slot.contentType}
        initialText={slot.fullText ?? ""}
        isSaving={pending === "editText"}
        onSave={(text) => {
          actions.editText(slot.contentType, text);
          setEditorOpen(false);
        }}
      />

      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} contentType={slot.contentType} slot={slot} />

      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(url) => actions.assignImage(slot.contentType, url)}
      />

      <ConfirmDialog
        open={confirmRegenerateText}
        onOpenChange={setConfirmRegenerateText}
        title="Перегенерувати текст?"
        description="Поточний текст буде замінено новою AI-версією."
        confirmLabel="Перегенерувати"
        onConfirm={() => {
          actions.regenerateText(slot.contentType);
          setConfirmRegenerateText(false);
        }}
      />

      <ConfirmDialog
        open={confirmRegenerateImage}
        onOpenChange={setConfirmRegenerateImage}
        title="Перегенерувати фото?"
        description="Поточне зображення буде замінено новим. Якщо генерація не вдасться, попереднє зображення залишиться."
        confirmLabel="Перегенерувати"
        onConfirm={() => {
          actions.regenerateImage(slot.contentType);
          setConfirmRegenerateImage(false);
        }}
      />
    </Card>
  );
}
