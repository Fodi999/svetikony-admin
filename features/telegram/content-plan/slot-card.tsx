"use client";

import { ExternalLink, Music2, MoreHorizontal, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { GuardedLink } from "@/components/layout/guarded-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MediaPickerDialog } from "../media-picker-dialog";
import { AUTOPOST_CONTENT_TYPE_LABELS, type ContentPlanSlot, type ContentPlanSlotStatus } from "@/types/entities";
import { PreviewDialog } from "./preview-dialog";
import { StatusBadge } from "./status-badge";
import { TextEditorDialog } from "./text-editor-dialog";
import type { SlotActions } from "./use-slot-actions";

function formatSentAt(sentAt: string): string {
  return new Date(sentAt).toLocaleString("uk-UA");
}

function fileNameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? url);
  } catch {
    return url;
  }
}

/** Compact check/dash row for the source/verification/text/image state --
 * replaces the old comma-separated text line, which repeated "Немає
 * джерела" up to three times for a MISSING_SOURCE slot (see the simplified
 * one-liner below, which replaces this grid entirely for that status). */
function StateRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={ok ? "text-emerald-500" : "text-muted-foreground"}>{ok ? "✓" : "—"}</span>
    </div>
  );
}

/** No actions at all for a slot that can't be acted on yet/anymore. READY
 * is handled separately (a reduced, non-empty action set), not folded into
 * this set. */
const NO_ACTIONS_STATUSES = new Set<ContentPlanSlotStatus>(["SENT", "SENDING", "REVIEW_REQUIRED", "MISSING_SOURCE"]);

export function SlotCard({
  slot,
  actions,
  calendarDayId,
  civilDate,
}: {
  slot: ContentPlanSlot;
  actions: SlotActions;
  /** church_calendar_days.id for this day, when one exists -- powers the
   * "Відкрити календар" link for MISSING_SOURCE/REVIEW_REQUIRED slots
   * (task: "не предлагать AI выдумать content, а направить у джерело"). */
  calendarDayId: string | null;
  /** This day's civil date (YYYY-MM-DD) -- used only to build a stable
   * Media Library entityId for photo/audio uploads (see mediaEntityId
   * below); every other action already addresses the slot via the
   * DayDrawer's own (date, contentType) pair passed through `actions`. */
  civilDate: string;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [audioPickerOpen, setAudioPickerOpen] = useState(false);
  const [confirmRegenerateText, setConfirmRegenerateText] = useState(false);
  const [confirmRegenerateImage, setConfirmRegenerateImage] = useState(false);

  /** Stable per-slot id for MediaUploadButton -- a slot may not have a
   * telegram_posts row yet (assignImage/assignAudio create one, same as
   * every other Content Plan action), so this can't be the row's own id;
   * (date, contentType) is already this slot's real identity everywhere
   * else in the UI. Matches lib/media/keys.ts's SAFE_SEGMENT pattern
   * (letters/digits/underscore/dash only) on both repos. */
  const mediaEntityId = `${civilDate}-${slot.contentType}`;

  const pending = actions.pendingAction(slot.contentType);
  const status = slot.publicationStatus;
  const isSent = status === "SENT";
  const isSending = status === "SENDING";
  const isReady = status === "READY";
  const isMissingSource = status === "MISSING_SOURCE";
  const isReviewRequired = status === "REVIEW_REQUIRED";
  const hasActions = !NO_ACTIONS_STATUSES.has(status);
  const hasSecondaryActions = hasActions && !isReady && (slot.textAvailable || slot.imageAvailable);
  /** Unlike regenerate (AI-only, gated to !isReady), manual media
   * assign/remove is allowed on a READY slot too -- this task's explicit
   * "no demotion on media edit" decision (setAutopostImageResult/
   * setAutopostAudioResult never touch status) is only meaningful if the
   * UI actually lets an admin change media without first unreadying the
   * slot. */
  const canEditMedia = hasActions;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {slot.scheduledTime} — {AUTOPOST_CONTENT_TYPE_LABELS[slot.contentType]}
        </CardTitle>
        <div className="flex items-center gap-1">
          <StatusBadge status={status} />
          {hasSecondaryActions ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Додаткові дії"
                disabled={!!pending}
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {slot.textAvailable ? (
                  <DropdownMenuItem onClick={() => setConfirmRegenerateText(true)}>Перегенерувати текст</DropdownMenuItem>
                ) : null}
                {slot.imageAvailable ? (
                  <DropdownMenuItem onClick={() => setConfirmRegenerateImage(true)}>Перегенерувати фото</DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        {isMissingSource || isReviewRequired ? (
          <div className="space-y-2">
            <p className={isReviewRequired ? "text-sm text-orange-400" : "text-sm text-muted-foreground"}>
              {isMissingSource
                ? "Неможливо підготувати публікацію: для цього дня відсутнє перевірене джерело."
                : "Потрібна перевірка календаря перед публікацією."}
              {" "}
              Потрібно виправити джерело у Церковному календарі.
            </p>
            {calendarDayId ? (
              <Button size="sm" variant="outline" render={<GuardedLink href={`/calendar/${calendarDayId}`} />}>
                <ExternalLink className="size-4" />
                Відкрити календар
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <StateRow label="Джерело" ok={slot.sourceStatus === "available"} />
            {slot.verificationStatus ? <StateRow label="Перевірка" ok={slot.verificationStatus === "verified"} /> : null}
            <StateRow label="Текст" ok={slot.textAvailable} />
            <StateRow label="Зображення" ok={slot.imageAvailable} />
            <StateRow label="Аудіо" ok={slot.audioAvailable} />
          </div>
        )}

        {slot.textPreview ? <p className="whitespace-pre-wrap text-sm text-foreground/90">{slot.textPreview}…</p> : null}

        {slot.imageUrl ? (
          <div className="space-y-1">
            <button type="button" aria-label="Переглянути зображення" onClick={() => setPreviewOpen(true)} className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slot.imageUrl} alt="" className="aspect-video w-full rounded-md border object-cover" />
            </button>
            {canEditMedia ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive"
                disabled={!!pending}
                onClick={() => actions.removeImage(slot.contentType)}
              >
                <X className="size-3.5" />
                {pending === "removeImage" ? "Видалення…" : "Видалити фото"}
              </Button>
            ) : null}
          </div>
        ) : canEditMedia ? (
          <div className="flex flex-wrap gap-2">
            <MediaUploadButton
              kind="image"
              module="telegram"
              entityId={mediaEntityId}
              purpose="post-image"
              label="Завантажити фото"
              onUploaded={({ url }) => actions.assignImage(slot.contentType, url)}
            />
            <Button size="sm" variant="outline" disabled={!!pending} onClick={() => setImagePickerOpen(true)}>
              Обрати фото з медіатеки
            </Button>
          </div>
        ) : null}

        {slot.audioUrl ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 rounded-md border p-2 text-xs">
              <Music2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 truncate">{fileNameFromUrl(slot.audioUrl)}</span>
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- spoken-word church audio, no captioning pipeline exists */}
            <audio controls src={slot.audioUrl} className="h-8 w-full" />
            {canEditMedia ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive"
                disabled={!!pending}
                onClick={() => actions.removeAudio(slot.contentType)}
              >
                <X className="size-3.5" />
                {pending === "removeAudio" ? "Видалення…" : "Видалити аудіо"}
              </Button>
            ) : null}
          </div>
        ) : canEditMedia ? (
          <div className="flex flex-wrap gap-2">
            <MediaUploadButton
              kind="audio"
              module="telegram"
              entityId={mediaEntityId}
              purpose="post-audio"
              label="Завантажити аудіо"
              onUploaded={({ url }) => actions.assignAudio(slot.contentType, url)}
            />
            <Button size="sm" variant="outline" disabled={!!pending} onClick={() => setAudioPickerOpen(true)}>
              Обрати аудіо з медіатеки
            </Button>
          </div>
        ) : null}

        {slot.errorMessage ? <p className="text-xs text-destructive">{slot.errorMessage}</p> : null}

        {isSent ? (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              {slot.telegramMessageId ? `Message ID: ${slot.telegramMessageId}` : null}
              {slot.telegramMessageId && slot.sentAt ? " · " : null}
              {slot.sentAt ? formatSentAt(slot.sentAt) : null}
            </p>
            {slot.textPreview ? (
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setPreviewOpen(true)}>
                Переглянути
              </Button>
            ) : null}
          </div>
        ) : null}

        {isSending ? <p className="text-xs text-blue-400">Слот у процесі публікації — дії тимчасово недоступні.</p> : null}

        {hasActions ? (
          isReady ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" variant="outline" disabled={!!pending} onClick={() => setPreviewOpen(true)}>
                Переглянути
              </Button>
              <Button size="sm" variant="ghost" disabled={!!pending} onClick={() => actions.markUnready(slot.contentType)}>
                {pending === "markUnready" ? "Збереження…" : "Зняти з готовності"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex flex-wrap gap-2">
                {!slot.textAvailable ? (
                  <Button size="sm" variant="outline" disabled={!!pending} onClick={() => actions.generateText(slot.contentType)}>
                    {pending === "generateText" ? "Генерація…" : "Згенерувати текст"}
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" disabled={!!pending} onClick={() => setPreviewOpen(true)}>
                      Переглянути
                    </Button>
                    <Button size="sm" variant="outline" disabled={!!pending} onClick={() => setEditorOpen(true)}>
                      Редагувати
                    </Button>
                  </>
                )}
                {!slot.imageAvailable ? (
                  <Button size="sm" variant="outline" disabled={!!pending} onClick={() => actions.generateImage(slot.contentType)}>
                    {pending === "generateImage" ? "Генерація…" : "Згенерувати фото"}
                  </Button>
                ) : null}
              </div>

              {slot.textAvailable ? (
                <Button size="sm" disabled={!!pending} onClick={() => actions.markReady(slot.contentType)}>
                  {pending === "markReady" ? "Збереження…" : "Позначити готовим"}
                </Button>
              ) : null}
            </div>
          )
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
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        onSelect={(url) => actions.assignImage(slot.contentType, url)}
        kind="image"
      />

      <MediaPickerDialog
        open={audioPickerOpen}
        onOpenChange={setAudioPickerOpen}
        onSelect={(url) => actions.assignAudio(slot.contentType, url)}
        kind="audio"
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
