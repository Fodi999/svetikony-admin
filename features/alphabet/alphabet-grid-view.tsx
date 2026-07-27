"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check, CircleDashed, CircleSlash2, Plus, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StateMessage } from "@/components/feedback/state-message";
import { GuardedLink } from "@/components/layout/guarded-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { LANGUAGE_LABELS } from "@/lib/constants/labels";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AlphabetLetter, Language } from "@/types/entities";

export function AlphabetGridView() {
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();
  const editable = canEdit("content");

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<Language>("uk");
  const [reorderMode, setReorderMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<AlphabetLetter[] | null>(null);

  const allQuery = useQuery({
    queryKey: ["alphabetLetters", "all"],
    queryFn: () => apiClient.alphabetLetters.list({ pageSize: 500 }),
  });

  const query = useQuery({
    queryKey: ["alphabetLetters", { search, language }],
    queryFn: () =>
      apiClient.alphabetLetters.list({
        search: search || undefined,
        language,
        pageSize: 200,
      }),
  });

  const reorderMutation = useMutation({
    mutationFn: (groupIds: string[]) => apiClient.alphabetLetters.reorderGroups(groupIds),
    onSuccess: () => {
      toast.success("Порядок збережено");
      queryClient.invalidateQueries({ queryKey: ["alphabetLetters"] });
      setReorderMode(false);
      setLocalOrder(null);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const languageItems = Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }));

  const completenessByGroup = new Map<string, number>();
  for (const letter of allQuery.data?.items ?? []) {
    completenessByGroup.set(letter.translationGroupId, (completenessByGroup.get(letter.translationGroupId) ?? 0) + 1);
  }

  const items = localOrder ?? query.data?.items ?? [];

  function move(index: number, direction: -1 | 1) {
    const base = localOrder ?? query.data?.items ?? [];
    const next = [...base];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLocalOrder(next);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{messages.nav.alphabet}</h1>
          <p className="text-sm text-muted-foreground">Церковнослов&apos;янська азбука, 46 літер.</p>
        </div>
        {editable ? (
          <GuardedLink href="/alphabet/new" className={cn(buttonVariants(), "hidden md:inline-flex")}>
            <Plus className="size-4" />
            {messages.actions.create}
          </GuardedLink>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Пошук…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 flex-1 sm:max-w-xs" disabled={reorderMode} />
        <Select value={language} onValueChange={(v) => setLanguage(v as Language)} items={languageItems} disabled={reorderMode}>
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
        {editable ? (
          reorderMode ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!localOrder || reorderMutation.isPending}
                onClick={() => localOrder && reorderMutation.mutate(localOrder.map((l) => l.translationGroupId))}
              >
                <Save className="size-4" />
                Зберегти порядок
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReorderMode(false);
                  setLocalOrder(null);
                }}
              >
                {messages.actions.cancel}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setReorderMode(true)}>
              Змінити порядок
            </Button>
          )
        ) : null}
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
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
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {items.map((letter, index) => {
            const count = completenessByGroup.get(letter.translationGroupId) ?? 0;
            const CompletenessIcon = count >= 3 ? Check : count > 0 ? CircleDashed : CircleSlash2;
            const cardBody = (
              <Card className="relative transition-colors hover:bg-accent/50">
                <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
                  <CompletenessIcon
                    className={cn(
                      "absolute top-1.5 right-1.5 size-3.5",
                      count >= 3 ? "text-emerald-600" : count > 0 ? "text-amber-600" : "text-muted-foreground",
                    )}
                  />
                  <p className="truncate text-sm font-medium">{letter.name}</p>
                  {letter.pronunciation ? <p className="truncate text-xs text-muted-foreground">{letter.pronunciation}</p> : null}
                </CardContent>
              </Card>
            );

            if (reorderMode) {
              return (
                <div key={letter.id} className="space-y-1">
                  {cardBody}
                  <div className="flex justify-center gap-1">
                    <Button variant="outline" size="icon" className="size-7" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Вгору">
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7"
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label="Вниз"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <GuardedLink key={letter.id} href={`/alphabet/${letter.id}`}>
                {cardBody}
              </GuardedLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
