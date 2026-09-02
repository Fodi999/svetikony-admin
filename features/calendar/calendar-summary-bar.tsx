import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { CalendarDay } from "@/types/entities";
import { calendarDayStatusFlags } from "./calendar-day-status";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 text-center">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Month-scoped summary, built entirely from the days array the caller
 * already fetched for the visible month -- no extra request. There is no
 * backend aggregation endpoint for calendar days (unlike Telegram's
 * content-plan summary), and the task explicitly said not to build one
 * just for this: "Не усложняй backend только ради цифры 365." Always
 * reflects the whole month regardless of the active language/status
 * filter, so the numbers don't jump around as someone toggles a filter.
 */
export function CalendarSummaryBar({ daysInMonth, monthDays }: { daysInMonth: number; monthDays: CalendarDay[] }) {
  const stats = useMemo(() => {
    let published = 0;
    let draft = 0;
    let withPhoto = 0;
    let needsWork = 0;
    for (const day of monthDays) {
      const flags = calendarDayStatusFlags(day);
      if (flags.published) published += 1;
      if (day.status === "draft") draft += 1;
      if (flags.photo) withPhoto += 1;
      if (!flags.content || !flags.photo) needsWork += 1;
    }
    return { created: monthDays.length, published, draft, withPhoto, needsWork };
  }, [monthDays]);

  return (
    <Card>
      <CardContent className="flex flex-wrap divide-x p-3">
        <Stat label="днів" value={daysInMonth} />
        <Stat label="створено" value={stats.created} />
        <Stat label="опубліковано" value={stats.published} />
        <Stat label="чернеток" value={stats.draft} />
        <Stat label="з фото" value={stats.withPhoto} />
        <Stat label="потребують заповнення" value={stats.needsWork} />
      </CardContent>
    </Card>
  );
}
