"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarDay, Language } from "@/types/entities";

const LANGUAGES: Language[] = ["uk", "ru", "en"];

function statusLabel(sibling: CalendarDay | undefined): string {
  if (!sibling) return "немає перекладу";
  if (sibling.status === "published") return "опубліковано";
  if (sibling.status === "draft") return "чернетка";
  return sibling.status;
}

interface CalendarDayTranslationsTabProps {
  completenessPercent: Record<Language, number>;
  siblings: CalendarDay[];
  missingLanguages: Language[];
  fillMissingPending: boolean;
  fillMissingStatus?: string;
  onFillMissing: () => void;
}

/**
 * Dedicated "Переклади" tab (task section 16): per-language publish
 * status, then "Заповнити відсутнє з AI" for whichever of UK/RU/EN has no
 * record at all yet. Reuses the existing, already-shipped
 * prepareCalendarLanguages orchestrator (see the parent form's
 * fillMissingTranslationsMutation) -- it only ever CREATES a missing
 * sibling, never touches an existing one, so there is no "don't overwrite
 * a human translation" case to guard here: a language with any record at
 * all (draft or published) is simply not offered. The language-switch
 * control itself (TranslationSwitcher) stays visible above the tabs,
 * where it already was -- rendering it a second time in here would just
 * duplicate the same "tab"-role controls under a different DOM subtree.
 */
export function CalendarDayTranslationsTab({
  completenessPercent,
  siblings,
  missingLanguages,
  fillMissingPending,
  fillMissingStatus,
  onFillMissing,
}: CalendarDayTranslationsTabProps) {
  return (
    <div className="space-y-4">
      <ul className="space-y-1 text-sm">
        {LANGUAGES.map((lang) => {
          const sibling = siblings.find((day) => day.language === lang);
          return (
            <li key={lang} className="flex items-center gap-2">
              <span className="w-6 font-medium">{lang.toUpperCase()}</span>
              <span className={sibling?.status === "published" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                {sibling?.status === "published" ? "✓" : sibling ? "◐" : "—"} {statusLabel(sibling)}
              </span>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">{completenessPercent[lang]}%</span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {missingLanguages.length
            ? `Відсутні переклади: ${missingLanguages.map((l) => l.toUpperCase()).join(", ")}.`
            : "Усі три мови вже мають запис."}
        </p>
        <Button type="button" variant="outline" size="sm" disabled={!missingLanguages.length || fillMissingPending} onClick={onFillMissing}>
          <Sparkles className="size-4" />
          {fillMissingPending ? "Заповнюємо…" : "Заповнити відсутнє з AI"}
        </Button>
      </div>
      {fillMissingStatus ? (
        <p role="status" className={cn("text-sm text-muted-foreground")}>
          {fillMissingStatus}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">На сайті доступні лише опубліковані версії кожної мови окремо.</p>
    </div>
  );
}
