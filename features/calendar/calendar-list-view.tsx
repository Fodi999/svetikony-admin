"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { StateMessage } from "@/components/feedback/state-message";
import { StatusBadge } from "@/components/feedback/status-badge";
import { GuardedLink } from "@/components/layout/guarded-link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { LANGUAGE_LABELS } from "@/lib/constants/labels";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CalendarDay, ContentStatus, Language } from "@/types/entities";
import { filterCalendarDays } from "./calendar-day-filters";
import { CalendarMonthGrid } from "./calendar-month-grid";
import { CalendarSummaryBar } from "./calendar-summary-bar";

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

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const YEAR_OPTIONS = (() => {
  const currentYear = Number(todayIso().slice(0, 4));
  return [currentYear - 1, currentYear, currentYear + 1];
})();

function DayListCard({ day }: { day: CalendarDay }) {
  return (
    <GuardedLink href={`/calendar/${day.id}`} className="block">
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{day.title}</p>
            <StatusBadge status={day.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{day.date}</Badge>
            <Badge variant="outline">{LANGUAGE_LABELS[day.language]}</Badge>
          </div>
        </CardContent>
      </Card>
    </GuardedLink>
  );
}

/**
 * Church Calendar, calendar-first (task: "UI/UX рефакторинг Calendar" --
 * bring it up to features/telegram/content-plan's UX). Month is the
 * default view; List is the same table this page always had, now reframed
 * as a second presentation of the same month-scoped data rather than a
 * separate always-fetch-500 query. One list request per (month, year) --
 * see the queryKey below -- language/status filtering happens client-side
 * on that one month's worth of days, same precedent as
 * lib/api/http/calendar-days.ts's own client-side language/status filter.
 */
export function CalendarListView() {
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();
  const editable = canEdit("content");

  const todayStr = todayIso();
  const [cursor, setCursor] = useState(() => ({ year: Number(todayStr.slice(0, 4)), month: Number(todayStr.slice(5, 7)) - 1 }));
  const [viewMode, setViewMode] = useState<"month" | "list">("month");
  const [language, setLanguage] = useState<Language | "all">("uk");
  const [status, setStatus] = useState<ContentStatus | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarDay | null>(null);

  const monthKey = `${cursor.year}-${pad(cursor.month + 1)}`;

  const query = useQuery({
    queryKey: ["calendarDays", { month: monthKey }],
    queryFn: () => apiClient.calendarDays.list({ month: monthKey, pageSize: 500 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.calendarDays.remove(id),
    onSuccess: () => {
      toast.success("Календарний день видалено");
      queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const monthDays = useMemo(() => query.data?.items ?? [], [query.data]);

  const filteredDays = useMemo(() => filterCalendarDays(monthDays, { language, status }), [monthDays, language, status]);

  const daysByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const day of filteredDays) map.set(day.date, day);
    return map;
  }, [filteredDays]);

  const existingDates = useMemo(() => new Set(monthDays.map((day) => day.date)), [monthDays]);

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  function goToToday() {
    const t = todayIso();
    setCursor({ year: Number(t.slice(0, 4)), month: Number(t.slice(5, 7)) - 1 });
  }
  function goToPrevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }));
  }
  function goToNextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }));
  }

  const languageItems = [
    { value: "all", label: "Усі мови" },
    ...Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label })),
  ];
  const statusItems = [
    { value: "all", label: "Усі статуси" },
    { value: "draft", label: messages.status.draft },
    { value: "published", label: messages.status.published },
    { value: "archived", label: messages.status.archived },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{messages.nav.calendar}</h1>
          <p className="text-sm text-muted-foreground">Календарні дні сайту.</p>
        </div>
        {editable ? (
          <GuardedLink href="/calendar/new" className={cn(buttonVariants(), "hidden md:inline-flex")}>
            <Plus className="size-4" />
            {messages.actions.create}
          </GuardedLink>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToToday}>
          Сьогодні
        </Button>
        <Button variant="ghost" size="icon" onClick={goToPrevMonth} aria-label="Попередній місяць">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="w-40 text-center text-sm font-medium capitalize">
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
        <Select value={language} onValueChange={(v) => setLanguage(v as Language | "all")} items={languageItems}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languageItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus | "all")} items={statusItems}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : query.isError ? (
        <StateMessage
          variant="error"
          title={messages.states.errorTitle}
          description={errorMessageFor(query.error)}
          action={{ label: messages.actions.retry, onClick: () => query.refetch() }}
        />
      ) : (
        <>
          <CalendarSummaryBar daysInMonth={daysInMonth} monthDays={monthDays} />

          {/* Mobile: always the agenda-style card list, regardless of the
              Month/List toggle -- a 7-column grid doesn't fit a phone
              screen (task section 13), and this is the same list the
              desktop "Список" mode already uses. */}
          <div className="space-y-3 md:hidden">
            {filteredDays.length === 0 ? (
              <StateMessage variant="empty" title={messages.states.emptyTitle} description={messages.states.emptyDescription} />
            ) : (
              filteredDays.map((day) => <DayListCard key={day.id} day={day} />)
            )}
          </div>

          <div className="hidden md:block">
            {viewMode === "month" ? (
              <CalendarMonthGrid
                year={cursor.year}
                month={cursor.month}
                daysByDate={daysByDate}
                existingDates={existingDates}
                todayIso={todayStr}
                selectedDate={selectedDate}
                editable={editable}
                onSelectDate={setSelectedDate}
              />
            ) : filteredDays.length === 0 ? (
              <StateMessage variant="empty" title={messages.states.emptyTitle} description={messages.states.emptyDescription} />
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Назва</TableHead>
                      <TableHead>Мова</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDays.map((day) => (
                      <TableRow key={day.id}>
                        <TableCell>{day.date}</TableCell>
                        <TableCell>
                          <GuardedLink href={`/calendar/${day.id}`} className="block font-medium">
                            {day.title}
                          </GuardedLink>
                        </TableCell>
                        <TableCell>{LANGUAGE_LABELS[day.language]}</TableCell>
                        <TableCell>
                          <StatusBadge status={day.status} />
                        </TableCell>
                        <TableCell>
                          {editable ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              aria-label="Видалити"
                              onClick={(e) => {
                                e.preventDefault();
                                setPendingDelete(day);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}

      {editable ? (
        <GuardedLink
          href="/calendar/new"
          className="fixed right-4 bottom-20 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          aria-label={messages.actions.create}
        >
          <Plus className="size-6" />
        </GuardedLink>
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Видалити календарний день?"
        description={pendingDelete ? `«${pendingDelete.title}» буде видалено безповоротно.` : undefined}
        destructive
        confirmLabel={messages.actions.delete}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
