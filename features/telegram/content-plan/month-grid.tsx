import type { ContentPlanDay } from "@/types/entities";
import { DayCell } from "./day-cell";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Standard Пн-Нд month grid -- see features/calendar/calendar-month-grid.tsx
 * for the layout convention this follows (Monday-first, cursor supplied by
 * the parent tab rather than owned here, since the tab also needs the
 * cursor to drive the year picker and the agenda view). */
export function MonthGrid({
  year,
  month,
  daysByDate,
  todayIso,
  onSelectDay,
}: {
  year: number;
  month: number; // 0-11
  daysByDate: Map<string, ContentPlanDay>;
  todayIso: string;
  onSelectDay: (civilDate: string) => void;
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
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {cells.map((dayNum, i) => {
          if (dayNum === null) return <div key={`empty-${i}`} />;
          const civilDate = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
          const day = daysByDate.get(civilDate);
          if (!day) return <div key={civilDate} className="min-h-24 rounded-md border border-dashed opacity-40" />;
          return <DayCell key={civilDate} day={day} isToday={civilDate === todayIso} onClick={() => onSelectDay(civilDate)} />;
        })}
      </div>
    </div>
  );
}
