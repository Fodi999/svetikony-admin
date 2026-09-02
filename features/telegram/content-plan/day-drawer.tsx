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

/**
 * Opens on day-cell click; fetches the single day's full detail lazily via
 * its own query (only while `civilDate` is set) so the year/month view
 * never has to carry per-day text/images -- task: "получать только при
 * открытии Drawer".
 */
export function DayDrawer({ civilDate, onOpenChange }: { civilDate: string | null; onOpenChange: (open: boolean) => void }) {
  const dayQuery = useQuery({
    queryKey: ["telegram", "contentPlan", "day", civilDate],
    queryFn: () => apiClient.telegram.contentPlan.getDay(civilDate!),
    enabled: !!civilDate,
  });

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
                <SlotCard key={type} slot={dayQuery.data.slots[type]} />
              ))}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
