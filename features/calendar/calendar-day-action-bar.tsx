"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { messages } from "@/lib/i18n";

interface CalendarDayActionBarProps {
  workingCopy: boolean;
  submitting?: boolean;
  busy: boolean;
  onPreview: () => void;
  onSave: () => void;
  onPublish: () => void;
}

/** Sticky bottom action bar (task section 20) -- unchanged from the
 * form's previous inline markup, just extracted so it's reachable without
 * scrolling back to the header on a long page. */
export function CalendarDayActionBar({ workingCopy, submitting, busy, onPreview, onSave, onPublish }: CalendarDayActionBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-16 z-20 flex gap-2 border-t bg-background p-3 md:sticky md:bottom-0 md:inset-x-auto"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <Button type="button" variant="outline" className="h-11 flex-1" onClick={onPreview}>
        <Eye className="size-4" />
        {messages.actions.preview}
      </Button>
      {!workingCopy ? (
        <Button type="button" variant="secondary" className="h-11 flex-1" disabled={submitting || busy} onClick={onSave}>
          {messages.actions.save}
        </Button>
      ) : null}
      <Button type="button" className="h-11 flex-1" disabled={submitting || busy} onClick={onPublish}>
        {messages.actions.publish}
      </Button>
    </div>
  );
}
