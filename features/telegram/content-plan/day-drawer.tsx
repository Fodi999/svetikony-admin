"use client";

import { useQuery } from "@tanstack/react-query";
import { StateMessage } from "@/components/feedback/state-message";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { AUTOPOST_CONTENT_TYPES } from "@/types/entities";
import { formatFullUaDate } from "./date-format";
import { SlotCard } from "./slot-card";
import { useSlotActions } from "./use-slot-actions";

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

  return (
    <Sheet open={!!civilDate} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
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

        <div className="space-y-3 px-4 pb-4">
          <Badge variant="outline">Юліанський / старий стиль</Badge>

          {dayQuery.data?.calendarTitle ? <p className="text-base font-medium">{dayQuery.data.calendarTitle}</p> : null}

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
                <SlotCard key={type} slot={dayQuery.data.slots[type]} actions={actions} />
              ))}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
