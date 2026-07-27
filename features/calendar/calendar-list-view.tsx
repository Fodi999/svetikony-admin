"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, List, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarMonthGrid } from "@/features/calendar/calendar-month-grid";
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

export function CalendarListView() {
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();
  const editable = canEdit("content");

  const [view, setView] = useState<"list" | "grid">("list");
  const [language, setLanguage] = useState<Language | "all">("uk");
  const [status, setStatus] = useState<ContentStatus | "all">("all");
  const [pendingDelete, setPendingDelete] = useState<CalendarDay | null>(null);

  const query = useQuery({
    queryKey: ["calendarDays", { language, status }],
    queryFn: () =>
      apiClient.calendarDays.list({
        language: language === "all" ? undefined : language,
        status: status === "all" ? undefined : status,
        pageSize: 500,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.calendarDays.remove(id),
    onSuccess: () => {
      toast.success("Календарний день видалено");
      queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const items = query.data?.items ?? [];
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
        <div className="flex overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn("flex h-9 items-center gap-1.5 px-3 text-sm", view === "list" ? "bg-accent" : "")}
          >
            <List className="size-4" /> Список
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn("flex h-9 items-center gap-1.5 px-3 text-sm", view === "grid" ? "bg-accent" : "")}
          >
            <CalendarDays className="size-4" /> Календар
          </button>
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <StateMessage
          variant="error"
          title={messages.states.errorTitle}
          description={errorMessageFor(query.error)}
          action={{ label: messages.actions.retry, onClick: () => query.refetch() }}
        />
      ) : items.length === 0 ? (
        <StateMessage variant="empty" title={messages.states.emptyTitle} description={messages.states.emptyDescription} />
      ) : view === "grid" ? (
        <CalendarMonthGrid days={items} />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((day) => (
              <GuardedLink key={day.id} href={`/calendar/${day.id}`} className="block">
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
            ))}
          </div>

          <div className="hidden rounded-lg border md:block">
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
                {items.map((day) => (
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
