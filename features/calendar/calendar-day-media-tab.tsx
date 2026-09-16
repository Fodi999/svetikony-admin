"use client";

import { ChevronDown, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { MediaPickerDialog } from "@/components/forms/media-picker-dialog";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { CalendarDay } from "@/types/entities";

interface CalendarDayMediaTabProps {
  control: Control<CalendarDayFormValues>;
  mode: "create" | "edit";
  day?: CalendarDay;
  imageId: string | undefined;
  imagePreviewUrl: string | undefined;
  onSelectImage: (imageId: string) => void;
  onRemoveImage: () => void;
  onUploaded: (id: string) => void;
  generateImagePending: boolean;
  onGenerateImage: () => void;
  onRequestRegenerateImage: () => void;
}

/**
 * Replaces the raw "ID зображення" text box as the PRIMARY media workflow
 * (task section 13): a photo card (preview + Upload / Generate with AI /
 * Choose from library / Remove), with the raw id field demoted to a
 * collapsed "Розширено" disclosure for the rare case someone needs it --
 * not deleted, since nothing else exposes it.
 */
export function CalendarDayMediaTab({
  control,
  mode,
  day,
  imageId,
  imagePreviewUrl,
  onSelectImage,
  onRemoveImage,
  onUploaded,
  generateImagePending,
  onGenerateImage,
  onRequestRegenerateImage,
}: CalendarDayMediaTabProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Фото дня</p>
        {imagePreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePreviewUrl} alt="Попередній перегляд" className="h-40 w-auto rounded-md border object-cover" />
        ) : (
          <div className="flex h-40 w-full max-w-xs items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Немає фото
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <MediaUploadButton
            kind="image"
            module="calendar"
            entityId={day?.id ?? "draft"}
            purpose="main"
            label="Завантажити фото"
            onUploaded={({ id }) => onUploaded(id)}
          />
          {mode === "edit" && day ? (
            !imageId?.trim() ? (
              <Button type="button" variant="outline" size="sm" disabled={generateImagePending} onClick={onGenerateImage}>
                <Sparkles className="size-4" />
                {generateImagePending ? "Генерація…" : "Згенерувати AI"}
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled={generateImagePending} onClick={onRequestRegenerateImage}>
                <Sparkles className="size-4" />
                {generateImagePending ? "Генерація…" : "Замінити (AI)"}
              </Button>
            )
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            Вибрати з медіатеки
          </Button>
          {imageId?.trim() ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRemoveImage}>
              <X className="size-4" />
              Видалити
            </Button>
          ) : null}
        </div>
      </div>

      {day?.imageMetadata?.origin === "ai_generated" ? (
        <div className="space-y-1 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Зображення:</span>{" "}
            {day.imageMetadata.customPrompt
              ? "AI-ілюстрація за власним промтом"
              : day.imageMetadata.identityVerified
                ? "AI-ілюстрація"
                : "AI-ілюстрація · тематичний образ"}
          </p>
          {day.imageMetadata.customPrompt ? (
            <p>
              <span className="font-medium text-foreground">Промпт:</span> {day.imageMetadata.customPrompt}
            </p>
          ) : (
            <p>
              <span className="font-medium text-foreground">Референс:</span>{" "}
              {day.imageMetadata.referenceProvider ? "Wikipedia / Wikimedia Commons" : "Референс не знайдено"}
            </p>
          )}
          {day.imageMetadata.identityVerified ? (
            <p>
              <span className="font-medium text-foreground">Статус:</span> Особу підтверджено
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-t pt-3">
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
        >
          <ChevronDown className={advancedOpen ? "size-3.5 rotate-180 transition-transform" : "size-3.5 transition-transform"} />
          Розширено
        </button>
        {advancedOpen ? (
          <div className="mt-2">
            <TextField control={control} name="imageId" label="ID зображення" description="Посилання на медіатеку. Заповнюється автоматично кнопками вище; вручну -- лише для нетипових випадків." />
          </div>
        ) : null}
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        module="calendar"
        onSelect={(url) => {
          onSelectImage(url);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
