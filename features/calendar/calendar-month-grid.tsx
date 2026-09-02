import type { CalendarDay } from "@/types/entities";
import { CalendarDayCell } from "./calendar-day-cell";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Pure month grid: Monday-first 7-column layout, one CalendarDayCell per
 * day of the month. All data (which dates have a visible record, which
 * exist but are filtered out, which is today/selected) is computed by the
 * caller -- this component owns no query and no filter state, matching
 * features/telegram/content-plan/month-grid.tsx's split between the
 * orchestrating tab and the plain grid renderer.
 */
export function CalendarMonthGrid({
  year,
  month,
  daysByDate,
  existingDates,
  todayIso,
  selectedDate,
  editable,
  onSelectDate,
}: {
  year: number;
  month: number; // 0-11
  daysByDate: Map<string, CalendarDay>;
  existingDates: Set<string>;
  todayIso: string;
  selectedDate: string | null;
  editable: boolean;
  onSelectDate?: (dateIso: string) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-lg border p-3">
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {cells.map((dayNum, index) => {
          if (dayNum === null) return <div key={`empty-${index}`} />;
          const dateIso = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
          const day = daysByDate.get(dateIso);
          return (
            <CalendarDayCell
              key={dateIso}
              dateIso={dateIso}
              day={day}
              hiddenByFilter={!day && existingDates.has(dateIso)}
              isToday={dateIso === todayIso}
              isSelected={dateIso === selectedDate}
              editable={editable}
              onOpen={onSelectDate}
            />
          );
        })}
      </div>
    </div>
  );
}
