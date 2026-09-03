"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { GuardedLink } from "@/components/layout/guarded-link";
import { StateMessage } from "@/components/feedback/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { AUTOPOST_CONTENT_TYPES, type ContentPlanDay } from "@/types/entities";
import { formatFullUaDate } from "./date-format";
import { PrepareDayPanel } from "./prepare-day-panel";
import { SlotCard } from "./slot-card";
import { useSlotActions } from "./use-slot-actions";

function daySlotSummary(day: ContentPlanDay): { total: number; available: number; ready: number; missingSource: number } {
  const slots = Object.values(day.slots);
  return {
    total: slots.length,
    available: slots.filter((s) => s.sourceStatus === "available").length,
    ready: slots.filter((s) => s.publicationStatus === "READY" || s.publicationStatus === "SENDING").length,
    missingSource: slots.filter((s) => s.publicationStatus === "MISSING_SOURCE").length,
  };
}

/**
 * Opens on day-cell click; fetches the single day's full detail lazily via
 * its own query (only while `civilDate` is set) so the year/month view
 * never has to carry per-day text/images -- task: "получать только при
 * открытии Drawer". `year` is only used to invalidate the right
 * `['telegram','contentPlan',year]` summary query after a slot action --
 * it's always the year `civilDate` falls in, passed down by the tab that
 * already tracks the selected year.
 */
export function DayDrawer({
  civilDate,
  year,
  onOpenChange,
}: {
  civilDate: string | null;
  year: number;
  onOpenChange: (open: boolean) => void;
}) {
  const dayQuery = useQuery({
    queryKey: ["telegram", "contentPlan", "day", civilDate],
    queryFn: () => apiClient.telegram.contentPlan.getDay(civilDate!),
    enabled: !!civilDate,
  });
  // Always called (never conditionally) -- civilDate is only null while
  // the Sheet is closed, and the mutations it builds are inert until one
  // is actually triggered from an open SlotCard.
  const actions = useSlotActions(civilDate ?? "", year);
  const summary = dayQuery.data ? daySlotSummary(dayQuery.data) : null;

  return (
    <Sheet open={!!civilDate} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "overflow-y-auto",
          // components/ui/sheet.tsx's own base classes already set
          // `data-[side=right]:w-3/4` and `data-[side=right]:sm:max-w-sm`
          // (384px) -- a bare `sm:max-w-xl` here (no `data-[side=right]:`
          // prefix) is a DIFFERENT tailwind-merge conflict group (different
          // variant chain) and a lower-specificity CSS selector (no
          // attribute selector), so it silently loses to the base classes
          // instead of overriding them. Matching the exact `data-[side=
          // right]:` prefix is what makes twMerge dedupe them and the
          // override actually apply.
          "data-[side=right]:w-full",
          // Mobile + tablet: near-full-screen, never a narrow ~350px
          // column (task: "не оставлять узкую колонку").
          "data-[side=right]:sm:max-w-none",
          // Desktop: responsive width via clamp-equivalent min()/clamp(),
          // never more than ~45vw (comfortably under the "не больше ~50%
          // viewport" ceiling) so the calendar underneath stays visible.
          "data-[side=right]:lg:max-w-[min(45vw,640px)]",
          "data-[side=right]:xl:max-w-[clamp(560px,45vw,640px)]",
          // Large desktop: allow up to 680px.
          "data-[side=right]:2xl:max-w-[clamp(560px,45vw,680px)]"
        )}
      >
        <SheetHeader>
          <SheetTitle>
            {civilDate ? formatFullUaDate(civilDate) : ""}
            {dayQuery.data ? (
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                {formatFullUaDate(dayQuery.data.julianDate)} ст.ст.
              </span>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Юліанський / старий стиль</Badge>
            {summary ? (
              <span className="text-xs text-muted-foreground">
                {summary.total} слотів · {summary.available} доступні · {summary.ready} готові · {summary.missingSource} без джерела
              </span>
            ) : null}
          </div>

          {dayQuery.data?.calendarTitle ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-medium">{dayQuery.data.calendarTitle}</p>
              {dayQuery.data.calendarDayId ? (
                <Button variant="ghost" size="sm" render={<GuardedLink href={`/calendar/${dayQuery.data.calendarDayId}`} />}>
                  <ExternalLink className="size-4" />
                  Відкрити в Церковному календарі
                </Button>
              ) : null}
            </div>
          ) : null}

          {civilDate ? <PrepareDayPanel civilDate={civilDate} year={year} /> : null}

          {dayQuery.isLoading ? (
            <div className="space-y-2">
              {AUTOPOST_CONTENT_TYPES.map((type) => (
                <Skeleton key={type} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : dayQuery.isError ? (
            <StateMessage variant="error" title="Не вдалося завантажити день" description={errorMessageFor(dayQuery.error)} />
          ) : dayQuery.data ? (
            <div className="space-y-3">
              {AUTOPOST_CONTENT_TYPES.map((type) => (
                <SlotCard
                  key={type}
                  slot={dayQuery.data.slots[type]}
                  actions={actions}
                  calendarDayId={dayQuery.data.calendarDayId}
                  civilDate={civilDate ?? ""}
                />
              ))}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
