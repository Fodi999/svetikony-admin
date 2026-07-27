"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter, Music, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { StateMessage } from "@/components/feedback/state-message";
import { StatusBadge } from "@/components/feedback/status-badge";
import { GuardedLink } from "@/components/layout/guarded-link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { LANGUAGE_LABELS, PRAYER_TYPE_LABELS } from "@/lib/constants/labels";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ContentStatus, Language, Prayer, PrayerType } from "@/types/entities";

export function PrayerListView() {
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();
  const editable = canEdit("content");

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<Language | "all">("all");
  const [status, setStatus] = useState<ContentStatus | "all">("all");
  const [prayerType, setPrayerType] = useState<PrayerType | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Prayer | null>(null);

  const query = useQuery({
    queryKey: ["prayers", { search, language, status }],
    queryFn: () =>
      apiClient.prayers.list({
        search: search || undefined,
        language: language === "all" ? undefined : language,
        status: status === "all" ? undefined : status,
        pageSize: 200,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.prayers.remove(id),
    onSuccess: () => {
      toast.success("Молитву видалено");
      queryClient.invalidateQueries({ queryKey: ["prayers"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const items = (query.data?.items ?? []).filter(
    (prayer) => prayerType === "all" || prayer.prayerType === prayerType,
  );
  const activeFilterCount = [language, status, prayerType].filter((v) => v !== "all").length;

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
  const prayerTypeItems = [
    { value: "all", label: "Усі типи" },
    ...Object.entries(PRAYER_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{messages.nav.prayers}</h1>
          <p className="text-sm text-muted-foreground">Список молитов сайту.</p>
        </div>
        {editable ? (
          <GuardedLink href="/prayers/new" className={cn(buttonVariants(), "hidden md:inline-flex")}>
            <Plus className="size-4" />
            {messages.actions.create}
          </GuardedLink>
        ) : null}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук за назвою або текстом…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-9"
          />
        </div>

        {/* Mobile: filters open in a bottom sheet */}
        <Button variant="outline" className="h-11 md:hidden" onClick={() => setFiltersOpen(true)}>
          <Filter className="size-4" />
          {messages.actions.filters}
          {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount}</Badge> : null}
        </Button>

        {/* Desktop: inline filters */}
        <div className="hidden gap-2 md:flex">
          <Select value={language} onValueChange={(v) => setLanguage(v as Language | "all")} items={languageItems}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Мова" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі мови</SelectItem>
              {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus | "all")} items={statusItems}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі статуси</SelectItem>
              <SelectItem value="draft">{messages.status.draft}</SelectItem>
              <SelectItem value="published">{messages.status.published}</SelectItem>
              <SelectItem value="archived">{messages.status.archived}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={prayerType} onValueChange={(v) => setPrayerType(v as PrayerType | "all")} items={prayerTypeItems}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі типи</SelectItem>
              {Object.entries(PRAYER_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
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
        <StateMessage
          variant="empty"
          title={messages.states.emptyTitle}
          description={messages.states.emptyDescription}
          action={editable ? { label: "Додати молитву", onClick: () => (window.location.href = "/prayers/new") } : undefined}
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {items.map((prayer) => (
              <GuardedLink key={prayer.id} href={`/prayers/${prayer.id}`} className="block">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{prayer.title}</p>
                      <StatusBadge status={prayer.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{LANGUAGE_LABELS[prayer.language]}</Badge>
                      <Badge variant="outline">{PRAYER_TYPE_LABELS[prayer.prayerType]}</Badge>
                      {prayer.audioUrl ? (
                        <span className="flex items-center gap-1">
                          <Music className="size-3" /> аудіо
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </GuardedLink>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Мова</TableHead>
                  <TableHead>Аудіо</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((prayer) => (
                  <TableRow key={prayer.id} className="cursor-pointer">
                    <TableCell className="whitespace-normal">
                      <GuardedLink href={`/prayers/${prayer.id}`} className="block font-medium">
                        {prayer.title}
                      </GuardedLink>
                    </TableCell>
                    <TableCell>{PRAYER_TYPE_LABELS[prayer.prayerType]}</TableCell>
                    <TableCell>{LANGUAGE_LABELS[prayer.language]}</TableCell>
                    <TableCell>{prayer.audioUrl ? <Music className="size-4" /> : "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={prayer.status} />
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
                            e.stopPropagation();
                            setPendingDelete(prayer);
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
          href="/prayers/new"
          className="fixed right-4 bottom-20 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          aria-label={messages.actions.create}
        >
          <Plus className="size-6" />
        </GuardedLink>
      ) : null}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{messages.actions.filters}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 p-4 pt-0">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Мова</p>
              <Select value={language} onValueChange={(v) => setLanguage(v as Language | "all")} items={languageItems}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Усі мови</SelectItem>
                  {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Статус</p>
              <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus | "all")} items={statusItems}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Усі статуси</SelectItem>
                  <SelectItem value="draft">{messages.status.draft}</SelectItem>
                  <SelectItem value="published">{messages.status.published}</SelectItem>
                  <SelectItem value="archived">{messages.status.archived}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Тип</p>
              <Select value={prayerType} onValueChange={(v) => setPrayerType(v as PrayerType | "all")} items={prayerTypeItems}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Усі типи</SelectItem>
                  {Object.entries(PRAYER_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="h-11 w-full" onClick={() => setFiltersOpen(false)}>
              Показати {items.length} результатів
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Видалити молитву?"
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
