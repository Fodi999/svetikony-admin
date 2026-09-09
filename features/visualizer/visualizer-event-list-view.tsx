"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { StateMessage } from "@/components/feedback/state-message";
import { StatusBadge } from "@/components/feedback/status-badge";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { GuardedLink } from "@/components/layout/guarded-link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { LANGUAGE_LABELS } from "@/lib/constants/labels";
import { VISUALIZER_ERA_LABELS, VISUALIZER_EVENT_TYPE_LABELS } from "@/lib/constants/visualizer-labels";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ContentStatus, Language, VisualizerEvent } from "@/types/entities";

function BaseEarthModelCard({ editable }: { editable: boolean }) {
  const queryClient = useQueryClient();
  const modelsQuery = useQuery({
    queryKey: ["visualizerModels", "all"],
    queryFn: () => apiClient.visualizerModels.list(),
  });
  const baseModel = modelsQuery.data?.find((m) => m.isBaseEarth) ?? null;

  const replaceMutation = useMutation({
    mutationFn: async ({ r2Key, filename, mimeType, fileSize }: { r2Key: string; filename?: string; mimeType?: string; fileSize?: number }) => {
      const previous = baseModel;
      const created = await apiClient.visualizerModels.create({ title: "Earth (base)", r2Key, filename, mimeType, fileSize });
      await apiClient.visualizerModels.setBaseEarth(created.id);
      if (previous) {
        try {
          await apiClient.visualizerModels.remove(previous.id, { force: true });
        } catch {
          // Best-effort cleanup of the now-superseded model; the new one is
          // already active either way.
        }
      }
      return created;
    },
    onSuccess: () => {
      toast.success("Основну модель Землі оновлено");
      queryClient.invalidateQueries({ queryKey: ["visualizerModels"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-medium">Основна модель Землі</p>
          <p className="text-sm text-muted-foreground">
            {baseModel ? baseModel.filename || baseModel.r2Key : "Ще не завантажена — публічний візуалізатор не працюватиме без неї."}
          </p>
        </div>
        {editable ? (
          <MediaUploadButton
            kind="model"
            module="visualizer"
            entityId="earth-base"
            purpose="model"
            label={baseModel ? "Замінити модель" : "Завантажити модель"}
            onUploaded={({ id }) => {
              void replaceMutation.mutateAsync({ r2Key: id });
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function VisualizerEventListView() {
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();
  const editable = canEdit("content");

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<Language | "all">("all");
  const [status, setStatus] = useState<ContentStatus | "all">("all");
  const [pendingDelete, setPendingDelete] = useState<VisualizerEvent | null>(null);

  const query = useQuery({
    queryKey: ["visualizerEvents", { search, language, status }],
    queryFn: () =>
      apiClient.visualizerEvents.list({
        search: search || undefined,
        language: language === "all" ? undefined : language,
        status: status === "all" ? undefined : status,
        pageSize: 200,
      }),
  });

  const modelsQuery = useQuery({
    queryKey: ["visualizerModels", "all"],
    queryFn: () => apiClient.visualizerModels.list(),
  });
  const groupsWithModels = new Set((modelsQuery.data ?? []).filter((m) => m.eventGroupId).map((m) => m.eventGroupId));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.visualizerEvents.remove(id),
    onSuccess: () => {
      toast.success("Подію видалено");
      queryClient.invalidateQueries({ queryKey: ["visualizerEvents"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const items = query.data?.items ?? [];
  const languageItems = [{ value: "all", label: "Усі мови" }, ...Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))];
  const statusItems = [
    { value: "all", label: "Усі статуси" },
    { value: "draft", label: messages.status.draft },
    { value: "published", label: messages.status.published },
    { value: "archived", label: messages.status.archived },
  ];

  function dateLabel(event: VisualizerEvent): string {
    if (event.displayDate) return event.displayDate;
    if (event.yearStart != null) return `${event.yearStart} ${event.calendarEra === "BC" ? "до н.е." : ""}`.trim();
    if (event.century != null) return `${event.century} ст.`;
    return "—";
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{messages.nav.visualizer}</h1>
          <p className="text-sm text-muted-foreground">Історичні та біблійні події для 3D-візуалізатора.</p>
        </div>
        {editable ? (
          <GuardedLink href="/visualizer/new" className={cn(buttonVariants(), "hidden md:inline-flex")}>
            <Plus className="size-4" />
            {messages.actions.create}
          </GuardedLink>
        ) : null}
      </div>

      <BaseEarthModelCard editable={editable} />

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Пошук…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 flex-1 sm:max-w-xs" />
        <Select value={language} onValueChange={(v) => setLanguage(v as Language | "all")} items={languageItems}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languageItems.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus | "all")} items={statusItems}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
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
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {items.map((event) => (
            <GuardedLink key={event.id} href={`/visualizer/${event.id}`} className="relative block">
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{event.title}</p>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{VISUALIZER_EVENT_TYPE_LABELS[event.eventType]}</Badge>
                    <Badge variant="outline">{VISUALIZER_ERA_LABELS[event.era]}</Badge>
                    <Badge variant="outline">{LANGUAGE_LABELS[event.language]}</Badge>
                    {event.translationGroupId && groupsWithModels.has(event.translationGroupId) ? (
                      <Badge variant="outline" className="gap-1">
                        <Box className="size-3" />
                        3D
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {dateLabel(event)}
                    {event.locationName ? ` · ${event.locationName}` : ""}
                  </p>
                </CardContent>
              </Card>
              {editable ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 size-8 bg-background/80 text-destructive"
                  aria-label="Видалити"
                  onClick={(e) => {
                    e.preventDefault();
                    setPendingDelete(event);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </GuardedLink>
          ))}
        </div>
      )}

      {editable ? (
        <GuardedLink
          href="/visualizer/new"
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
        title="Видалити подію?"
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
