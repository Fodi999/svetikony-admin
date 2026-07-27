"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { LANGUAGE_LABELS } from "@/lib/constants/labels";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Article, ContentStatus, Language } from "@/types/entities";

export function ArticleListView() {
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();
  const editable = canEdit("content");

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<Language | "all">("all");
  const [status, setStatus] = useState<ContentStatus | "all">("all");
  const [pendingDelete, setPendingDelete] = useState<Article | null>(null);

  const query = useQuery({
    queryKey: ["articles", { search, language, status }],
    queryFn: () =>
      apiClient.articles.list({
        search: search || undefined,
        language: language === "all" ? undefined : language,
        status: status === "all" ? undefined : status,
        pageSize: 200,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.articles.remove(id),
    onSuccess: () => {
      toast.success("Статтю видалено");
      queryClient.invalidateQueries({ queryKey: ["articles"] });
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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{messages.nav.articles}</h1>
          <p className="text-sm text-muted-foreground">Статті сайту.</p>
        </div>
        {editable ? (
          <GuardedLink href="/articles/new" className={cn(buttonVariants(), "hidden md:inline-flex")}>
            <Plus className="size-4" />
            {messages.actions.create}
          </GuardedLink>
        ) : null}
      </div>

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
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((article) => (
              <GuardedLink key={article.id} href={`/articles/${article.id}`} className="block">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{article.title}</p>
                      <StatusBadge status={article.status} />
                    </div>
                    <Badge variant="outline">{LANGUAGE_LABELS[article.language]}</Badge>
                  </CardContent>
                </Card>
              </GuardedLink>
            ))}
          </div>

          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Мова</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <GuardedLink href={`/articles/${article.id}`} className="block font-medium">
                        {article.title}
                      </GuardedLink>
                    </TableCell>
                    <TableCell>{LANGUAGE_LABELS[article.language]}</TableCell>
                    <TableCell>
                      <StatusBadge status={article.status} />
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
                            setPendingDelete(article);
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
          href="/articles/new"
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
        title="Видалити статтю?"
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
