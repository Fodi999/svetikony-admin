"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { SVET_IKONY_SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { CalendarDay } from "@/types/entities";
import type { CalendarDayReadiness } from "./calendar-day-status";
import { calendarDayReadinessGaps } from "./calendar-day-status";
import { formatFullUaDate, formatMonthYear } from "./date-format";

interface CalendarDayHeaderProps {
  day: CalendarDay | undefined;
  title: string;
  date: string;
  language: string;
  readiness: CalendarDayReadiness;
}

/**
 * Top-of-editor workspace header (task: "make Calendar Day editing feel
 * like one coherent professional workspace"). Purely presentational, and
 * deliberately does NOT duplicate Save/Publish/Preview -- those already
 * have one reachable-without-scrolling home in CalendarDayActionBar (task
 * section 20 says to REUSE the existing sticky bar, not add a second
 * copy of the same actions elsewhere). The one action unique to this
 * header is "Переглянути на сайті", a real link to the public page.
 */
export function CalendarDayHeader({ day, title, date, language, readiness }: CalendarDayHeaderProps) {
  const gaps = calendarDayReadinessGaps(readiness);
  const publicUrl = day ? `${SVET_IKONY_SITE_URL}/${language}/church/calendar/${date}` : undefined;

  return (
    <div className="space-y-3 border-b bg-background p-4 md:p-6">
      <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/calendar" className="hover:text-foreground hover:underline">
          Календар
        </Link>
        {date ? (
          <>
            <span aria-hidden>/</span>
            <span>{formatMonthYear(date)}</span>
          </>
        ) : null}
        <span aria-hidden>/</span>
        <span className="text-foreground">{date ? formatFullUaDate(date) : "Новий день"}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{title || "Без назви"}</h1>
            {day ? <StatusBadge status={day.status} /> : null}
          </div>
          {day ? <p className="text-xs text-muted-foreground">День у календарі · ID: {day.id}</p> : null}
        </div>

        <div className="flex min-w-52 flex-1 flex-col gap-1 sm:max-w-xs">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Готовність дня</span>
            <span className={cn("font-semibold tabular-nums", readiness.percent === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {readiness.percent}%
            </span>
          </div>
          <Progress value={readiness.percent} aria-label="Готовність дня">
            <ProgressTrack>
              <ProgressIndicator className={readiness.percent === 100 ? "bg-emerald-500" : "bg-amber-500"} />
            </ProgressTrack>
          </Progress>
          {gaps.length ? <p className="text-xs text-muted-foreground">Не вистачає: {gaps.join(", ")}</p> : null}
        </div>

        {publicUrl ? (
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={publicUrl} target="_blank" rel="noreferrer" />}>
            <ExternalLink className="size-4" />
            Переглянути на сайті
          </Button>
        ) : null}
      </div>
    </div>
  );
}
