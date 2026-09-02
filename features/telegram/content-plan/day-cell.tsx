import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AUTOPOST_CONTENT_TYPE_SHORT_LABELS,
  AUTOPOST_CONTENT_TYPES,
  type ContentPlanDay,
  type ContentPlanSlotStatus,
} from "@/types/entities";
import { formatShortUaDate } from "./date-format";
import { STATUS_LABELS } from "./status-badge";

const DOT_CLASSNAMES: Record<ContentPlanSlotStatus, string> = {
  SENT: "bg-blue-500",
  SENDING: "bg-blue-500 animate-pulse",
  READY: "bg-emerald-500",
  SOURCE_READY: "bg-emerald-500/50",
  DRAFT: "bg-amber-500",
  MISSING_SOURCE: "bg-muted-foreground/25",
  REVIEW_REQUIRED: "bg-orange-500",
  FAILED: "bg-red-500",
};

export function DayCell({ day, isToday, onClick }: { day: ContentPlanDay; isToday: boolean; onClick: () => void }) {
  const dayNumber = Number(day.civilDate.slice(8, 10));

  return (
    // A plain `<div role="button">` rather than a real `<button>` -- the
    // slot dots below are themselves interactive Tooltip triggers, and a
    // `<button>` cannot legally contain another `<button>`.
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex h-full min-h-24 cursor-pointer flex-col gap-1 rounded-md border p-1.5 text-left transition-colors hover:bg-muted/50",
        isToday && "border-primary",
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className={cn("text-sm font-medium", isToday && "text-primary")}>{dayNumber}</span>
        <span className="truncate text-[10px] text-muted-foreground">ст.ст. {formatShortUaDate(day.julianDate)}</span>
      </div>
      {day.calendarTitle ? <span className="line-clamp-1 text-[11px] text-muted-foreground">{day.calendarTitle}</span> : null}
      <div className="mt-auto flex gap-1">
        {AUTOPOST_CONTENT_TYPES.map((type) => {
          const slot = day.slots[type];
          return (
            <Tooltip key={type}>
              <TooltipTrigger className={cn("size-2 rounded-full", DOT_CLASSNAMES[slot.publicationStatus])} />
              <TooltipContent>
                {slot.scheduledTime} {AUTOPOST_CONTENT_TYPE_SHORT_LABELS[type]} — {STATUS_LABELS[slot.publicationStatus]}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
