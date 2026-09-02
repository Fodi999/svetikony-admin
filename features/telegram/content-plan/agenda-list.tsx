import { AUTOPOST_CONTENT_TYPE_SHORT_LABELS, AUTOPOST_CONTENT_TYPES, type ContentPlanDay } from "@/types/entities";
import { formatFullUaDate, formatShortUaDate } from "./date-format";
import { StatusBadge } from "./status-badge";

/** Date-ordered list view -- used both for the explicit "Список" toggle on
 * desktop and as the tablet/mobile layout (task: "не пытаться втиснуть
 * desktop 7-column calendar на маленький экран"). */
export function AgendaList({ days, onSelectDay }: { days: ContentPlanDay[]; onSelectDay: (civilDate: string) => void }) {
  if (days.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Немає днів у цьому діапазоні.</p>;
  }

  return (
    <div className="divide-y rounded-lg border">
      {days.map((day) => (
        <div
          key={day.civilDate}
          role="button"
          tabIndex={0}
          onClick={() => onSelectDay(day.civilDate)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectDay(day.civilDate);
            }
          }}
          className="flex cursor-pointer flex-col gap-2 p-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-medium">{formatFullUaDate(day.civilDate)}</p>
            <p className="text-xs text-muted-foreground">
              ст.ст. {formatShortUaDate(day.julianDate)}
              {day.calendarTitle ? ` · ${day.calendarTitle}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AUTOPOST_CONTENT_TYPES.map((type) => {
              const slot = day.slots[type];
              return (
                <div key={type} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">{AUTOPOST_CONTENT_TYPE_SHORT_LABELS[type]}</span>
                  <StatusBadge status={slot.publicationStatus} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
