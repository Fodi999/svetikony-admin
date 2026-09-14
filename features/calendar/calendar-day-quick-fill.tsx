"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarDayQuickFillProps {
  fillMissingPending: boolean;
  onFillMissing: () => void;
  onResetChanges: () => void;
}

/** "Швидке заповнення" (task section 10) on the "Основне" tab -- the
 * EXISTING single-record fillMissing action, just relocated into its own
 * compact panel; distinct in scope from the header's "Підготувати день з
 * AI" (which also handles relations/translations across the whole day).
 * "Копіювати з іншого дня" is deliberately omitted: no existing
 * primitive makes it safe/straightforward (see the redesign plan). */
export function CalendarDayQuickFill({ fillMissingPending, onFillMissing, onResetChanges }: CalendarDayQuickFillProps) {
  return (
    <div className="space-y-2 rounded-xl border p-4">
      <p className="text-sm font-medium">Швидке заповнення</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={fillMissingPending} onClick={onFillMissing}>
          <Sparkles className="size-4" />
          {fillMissingPending ? "Заповнення…" : "Заповнити відсутнє з AI"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onResetChanges}>
          <RotateCcw className="size-4" />
          Скинути зміни
        </Button>
      </div>
    </div>
  );
}
