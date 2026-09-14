"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { GuardedLink } from "@/components/layout/guarded-link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CalendarDay } from "@/types/entities";
import { calendarDayCompletenessPercent, calendarDayStatusFlags, STATUS_DOTS } from "./calendar-day-status";
import { formatShortUaDate } from "./date-format";

const DOT_BASE = "size-1.5 rounded-full border";
const DOT_FILLED = "border-foreground/60 bg-foreground/70";
const DOT_EMPTY = "border-muted-foreground/25 bg-transparent";

const ALL_LANGUAGES = ["uk", "ru", "en"] as const;
const LANGUAGE_BADGE_CLASS: Record<"published" | "draft" | "empty", string> = {
  published: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  draft: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  empty: "border-dashed border-muted-foreground/25 text-muted-foreground/45",
};
const LANGUAGE_STATE_LABEL: Record<"published" | "draft" | "empty", string> = {
  published: "опубліковано",
  draft: "чернетка",
  empty: "немає перекладу",
};

/**
 * One month-grid cell. Two shapes:
 * - a real CalendarDay -> the compact "card" from the task spec (day
 *   number, old-style date, title, 4 derived status dots), clicking opens
 *   the existing /calendar/[id] editor.
 * - no record for that date ("virtual" slot) -> a quiet empty state with
 *   a "+ Створити" link straight into /calendar/new, prefilled with the
 *   date via a query param (see app/(dashboard)/calendar/new/page.tsx).
 *   No old-style date is shown here: there is no CalendarDay to read
 *   dateOldStyle from, and computing the Julian-calendar offset ourselves
 *   is exactly the kind of "recompute what the backend should own" the
 *   task warned against -- see the audit report.
 *
 * Renders as `role="button"` rather than a real link/button: the status
 * dots below are themselves focusable Tooltip triggers, and neither
 * `<a>` nor `<button>` may legally contain another focusable interactive
 * element (same constraint noted in
 * features/telegram/content-plan/day-cell.tsx).
 */
export function CalendarDayCell({
  dateIso,
  day,
  translations,
  hiddenByFilter,
  createLanguage = "uk",
  isToday,
  isSelected,
  editable,
  onOpen,
}: {
  dateIso: string;
  day: CalendarDay | undefined;
  /** Every translation that exists for this date (all languages, all
   * statuses) regardless of the active filter -- undefined is treated the
   * same as "only `day` itself exists", so callers that don't pass it
   * still render correctly. */
  translations?: CalendarDay[];
  /** True when a record exists for this date but the active language/status
   * filter hides it -- must not offer "+ Створити" then, or the action
   * would invite creating a duplicate right next to the hidden record. */
  hiddenByFilter: boolean;
  createLanguage?: CalendarDay["language"];
  isToday: boolean;
  isSelected: boolean;
  editable: boolean;
  /** Called right before navigating to the editor, so the caller can
   * remember this date as "selected" (task: "Если пользователь пришёл
   * назад из editor... более заметною border"). */
  onOpen?: (dateIso: string) => void;
}) {
  const router = useRouter();
  const { guardNavigation } = useUnsavedChanges();
  const dayNumber = Number(dateIso.slice(8, 10));

  const cellBase = cn(
    "flex h-full min-h-24 flex-col gap-1 rounded-md border p-1.5 text-left transition-colors",
    isSelected ? "border-primary ring-1 ring-primary/40" : isToday ? "border-primary" : "border-border",
  );

  if (!day) {
    return (
      <div className={cn(cellBase, "gap-0.5 border-dashed bg-transparent")}>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">{dayNumber}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{hiddenByFilter ? "Приховано фільтром" : "Немає запису"}</p>
        {editable && !hiddenByFilter ? (
          <GuardedLink
            href={`/calendar/new?date=${dateIso}&language=${createLanguage}`}
            className="mt-auto inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
          >
            <Plus className="size-3" aria-hidden />
            Створити
          </GuardedLink>
        ) : null}
      </div>
    );
  }

  const activeDay = day;
  const oldStyle = activeDay.dateOldStyle ? formatShortUaDate(activeDay.dateOldStyle) : null;
  const flags = calendarDayStatusFlags(activeDay);
  const completenessPercent = calendarDayCompletenessPercent(activeDay);
  const siblingTranslations = translations ?? [activeDay];
  const languageStates = ALL_LANGUAGES.map((lang) => {
    const sibling = siblingTranslations.find((item) => item.language === lang);
    const state: "published" | "draft" | "empty" = !sibling ? "empty" : sibling.status === "published" ? "published" : "draft";
    return { lang, state };
  });

  function open() {
    onOpen?.(dateIso);
    guardNavigation(() => router.push(`/calendar/${activeDay.id}`));
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
      className={cn(cellBase, "cursor-pointer hover:bg-muted/50")}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className={cn("text-sm font-medium", isToday && "text-primary")}>{dayNumber}</span>
        {oldStyle ? <span className="truncate text-[10px] text-muted-foreground">ст.ст. {oldStyle}</span> : null}
      </div>
      <p className="line-clamp-2 text-[11px] leading-snug text-foreground">{day.title}</p>
      <Tooltip>
        <TooltipTrigger
          className="block h-1.5 w-full overflow-hidden rounded-full bg-muted p-0"
          aria-label={`Заповненість картки: ${completenessPercent}%`}
        >
          <span
            className={cn(
              "block h-full rounded-full transition-[width]",
              completenessPercent === 100 ? "bg-emerald-500" : completenessPercent > 0 ? "bg-amber-500" : "bg-border",
            )}
            style={{ width: `${completenessPercent}%` }}
          />
        </TooltipTrigger>
        <TooltipContent>Заповнено на {completenessPercent}%</TooltipContent>
      </Tooltip>
      <div className="flex gap-1" role="group" aria-label="Статус перекладів">
        {languageStates.map(({ lang, state }) => (
          <Tooltip key={lang}>
            <TooltipTrigger
              className={cn(
                "h-4 flex-1 rounded border text-[9px] font-semibold uppercase leading-4",
                LANGUAGE_BADGE_CLASS[state],
              )}
            >
              {lang}
            </TooltipTrigger>
            <TooltipContent>
              {lang.toUpperCase()} — {LANGUAGE_STATE_LABEL[state]}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="mt-auto flex gap-1">
        {STATUS_DOTS.map(({ key, filledTooltip, emptyTooltip }) => {
          const filled = flags[key];
          return (
            <Tooltip key={key}>
              <TooltipTrigger className={cn(DOT_BASE, filled ? DOT_FILLED : DOT_EMPTY)} />
              <TooltipContent>{filled ? filledTooltip : emptyTooltip}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
