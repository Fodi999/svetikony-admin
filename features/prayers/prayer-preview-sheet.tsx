"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { LANGUAGE_LABELS, PRAYER_TYPE_LABELS } from "@/lib/constants/labels";
import type { PrayerFormValues } from "@/lib/validation/prayer.schema";

interface PrayerPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: PrayerFormValues;
}

export function PrayerPreviewSheet({ open, onOpenChange, values }: PrayerPreviewSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90svh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Попередній перегляд публічної сторінки</SheetTitle>
        </SheetHeader>
        <div className="mx-auto w-full max-w-lg space-y-4 p-4 pt-0">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{LANGUAGE_LABELS[values.language]}</Badge>
            <Badge variant="outline">{PRAYER_TYPE_LABELS[values.prayerType]}</Badge>
          </div>
          <h2 className="text-2xl font-semibold">{values.title || "Без назви"}</h2>
          {values.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={values.imageUrl} alt={values.title} className="w-full rounded-lg border object-cover" />
          ) : null}
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{values.text || "Текст молитви ще не додано."}</p>
          {values.audioUrl ? (
            <audio controls src={values.audioUrl} className="w-full">
              <track kind="captions" />
            </audio>
          ) : null}
          {values.source ? <p className="text-xs text-muted-foreground">Джерело: {values.source}</p> : null}
          {values.visualizerEnabled ? (
            <div
              className="flex h-32 items-center justify-center rounded-lg border text-xs text-muted-foreground"
              style={{ backgroundColor: values.backgroundColor }}
            >
              Тут буде відображено анімований візуалізатор
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
