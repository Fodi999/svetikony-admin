"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { StateMessage } from "@/components/feedback/state-message";
import { GuardedLink } from "@/components/layout/guarded-link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ProductCategory } from "@/types/entities";

export function CategoryListView() {
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();
  const editable = canEdit("catalog");

  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ProductCategory | null>(null);

  const query = useQuery({
    queryKey: ["categories", { search }],
    queryFn: () => apiClient.categories.list({ search: search || undefined, pageSize: 200 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.categories.remove(id),
    onSuccess: () => {
      toast.success("Категорію видалено");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{messages.nav.categories}</h1>
          <p className="text-sm text-muted-foreground">Категорії каталогу товарів.</p>
        </div>
        {editable ? (
          <GuardedLink href="/catalog/categories/new" className={cn(buttonVariants(), "hidden md:inline-flex")}>
            <Plus className="size-4" />
            {messages.actions.create}
          </GuardedLink>
        ) : null}
      </div>

      <Input placeholder="Пошук…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 sm:max-w-xs" />

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
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
            {items.map((category) => (
              <GuardedLink key={category.id} href={`/catalog/categories/${category.id}`} className="block">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center justify-between gap-2 p-4">
                    <p className="font-medium">{category.name}</p>
                    <Badge variant={category.active ? "outline" : "secondary"}>{category.active ? "Активна" : "Вимкнена"}</Badge>
                  </CardContent>
                </Card>
              </GuardedLink>
            ))}
          </div>

          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Порядок</TableHead>
                  <TableHead>Назва</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.order}</TableCell>
                    <TableCell>
                      <GuardedLink href={`/catalog/categories/${category.id}`} className="block font-medium">
                        {category.name}
                      </GuardedLink>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{category.slug}</TableCell>
                    <TableCell>
                      <Badge variant={category.active ? "outline" : "secondary"}>{category.active ? "Активна" : "Вимкнена"}</Badge>
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
                            setPendingDelete(category);
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
          href="/catalog/categories/new"
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
        title="Видалити категорію?"
        description={pendingDelete ? `«${pendingDelete.name}» буде видалено безповоротно.` : undefined}
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
