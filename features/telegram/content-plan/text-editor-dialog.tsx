"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AUTOPOST_CONTENT_TYPE_LABELS, type AutopostContentType } from "@/types/entities";

/**
 * Plain textarea editor -- no rich-text editor per the task ("не вводити
 * важкий rich-text editor без необхідності"). Local `value` state is reset
 * from `initialText` whenever the dialog transitions to open, so
 * cancelling never leaves a stale draft the next time it's reopened --
 * done by adjusting state during render (React's documented pattern for
 * this) rather than a `useEffect`, which would trigger an extra
 * synchronous re-render for the same result.
 */
export function TextEditorDialog({
  open,
  onOpenChange,
  contentType,
  initialText,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: AutopostContentType;
  initialText: string;
  onSave: (text: string) => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState(initialText);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue(initialText);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Редагувати текст — {AUTOPOST_CONTENT_TYPE_LABELS[contentType]}</DialogTitle>
        </DialogHeader>
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={12} placeholder="Текст публікації…" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={() => onSave(value)} disabled={isSaving || !value.trim()}>
            {isSaving ? "Збереження…" : "Зберегти"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
