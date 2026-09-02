"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { StateMessage } from "@/components/feedback/state-message";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { ContentPlanDay } from "@/types/entities";
import { AgendaList } from "./agenda-list";
import { DayDrawer } from "./day-drawer";
import { MonthGrid } from "./month-grid";
import { SummaryBar } from "./summary-bar";

const MONTH_NAMES = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

function todayKyivIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const YEAR_OPTIONS = (() => {
  const currentYear = Number(todayKyivIso().slice(0, 4));
  return [currentYear - 1, currentYear, currentYear + 1];
})();

/**
 * Read-only Telegram content calendar for the whole year (task: "TELEGRAM
 * CONTENT PLAN — YEAR CALENDAR UI"). Fetches the entire selected year once
 * (apiClient.telegram.contentPlan.get) so switching months is instant and
 * free; per-day full text/images are only fetched when a day is opened
 * (see DayDrawer). Purely a management/read view -- no generation, no
 * bulk actions, no status changes, no Telegram calls anywhere in this tab.
 */
export function ContentPlanTab() {
  const todayIso = todayKyivIso();
  const [cursor, setCursor] = useState(() => ({ year: Number(todayIso.slice(0, 4)), month: Number(todayIso.slice(5, 7)) - 1 }));
  const [viewMode, setViewMode] = useState<"month" | "list">("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const planQuery = useQuery({
    queryKey: ["telegram", "contentPlan", cursor.year],
    queryFn: () => apiClient.telegram.contentPlan.get({ year: cursor.year }),
  });

  const daysByDate = useMemo(() => {
    const map = new Map<string, ContentPlanDay>();
    for (const day of planQuery.data?.days ?? []) map.set(day.civilDate, day);
    return map;
  }, [planQuery.data]);

  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const monthDays = useMemo(() => (planQuery.data?.days ?? []).filter((d) => d.civilDate.startsWith(monthPrefix)), [planQuery.data, monthPrefix]);

  function goToToday() {
    setCursor({ year: Number(todayIso.slice(0, 4)), month: Number(todayIso.slice(5, 7)) - 1 });
  }
  function goToPrevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }));
  }
  function goToNextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Контент-план Telegram</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Сьогодні
          </Button>
          <Button variant="ghost" size="icon" onClick={goToPrevMonth} aria-label="Попередній місяць">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-40 text-center text-sm font-medium">
            {MONTH_NAMES[cursor.month]} {cursor.year}
          </span>
          <Button variant="ghost" size="icon" onClick={goToNextMonth} aria-label="Наступний місяць">
            <ChevronRight className="size-4" />
          </Button>
          <Select
            value={String(cursor.year)}
            onValueChange={(v) => setCursor((c) => ({ ...c, year: Number(v) }))}
            items={YEAR_OPTIONS.map((y) => ({ value: String(y), label: String(y) }))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex overflow-hidden rounded-md border">
            <Button
              variant={viewMode === "month" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("month")}
            >
              Місяць
            </Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("list")}>
              Список
            </Button>
          </div>
        </div>
      </div>

      {planQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : planQuery.isError ? (
        <StateMessage
          variant="error"
          title="Не вдалося завантажити контент-план"
          description={errorMessageFor(planQuery.error)}
          action={{ label: "Повторити", onClick: () => planQuery.refetch() }}
        />
      ) : planQuery.data ? (
        <>
          <SummaryBar summary={planQuery.data.summary} />
          {viewMode === "month" ? (
            <MonthGrid year={cursor.year} month={cursor.month} daysByDate={daysByDate} todayIso={todayIso} onSelectDay={setSelectedDate} />
          ) : (
            <AgendaList days={monthDays} onSelectDay={setSelectedDate} />
          )}
        </>
      ) : null}

      <DayDrawer civilDate={selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)} />
    </div>
  );
}
