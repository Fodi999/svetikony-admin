"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { GuardedLink } from "@/components/layout/guarded-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarDay } from "@/types/entities";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function CalendarMonthGrid({ days }: { days: CalendarDay[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("uk-UA", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const byDate = new Map<string, CalendarDay[]>();
  for (const day of days) {
    const list = byDate.get(day.date) ?? [];
    list.push(day);
    byDate.set(day.date, list);
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }))}>
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-medium capitalize">{monthLabel}</p>
        <Button variant="ghost" size="icon" onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
        {cells.map((dayNum, i) => {
          if (dayNum === null) return <div key={`empty-${i}`} />;
          const dateStr = `${cursor.year}-${pad(cursor.month + 1)}-${pad(dayNum)}`;
          const events = byDate.get(dateStr) ?? [];
          const cellContent = (
            <div
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-sm",
                events.length > 0 ? "bg-primary/10 font-medium" : "text-muted-foreground",
              )}
            >
              {dayNum}
              {events.length > 0 ? <span className="size-1.5 rounded-full bg-primary" /> : null}
            </div>
          );
          return events.length > 0 ? (
            <GuardedLink key={dateStr} href={`/calendar/${events[0].id}`} title={events.map((e) => e.title).join(", ")}>
              {cellContent}
            </GuardedLink>
          ) : (
            <div key={dateStr}>{cellContent}</div>
          );
        })}
      </div>
    </div>
  );
}
