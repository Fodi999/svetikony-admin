"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { StateMessage } from "@/components/feedback/state-message";
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
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/entities";

const STOCK_STATUS_LABELS: Record<string, string> = {
  in_stock: "В наявності",
  made_to_order: "Під замовлення",
  out_of_stock: "Немає в наявності",
};

export function ProductListView() {
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();
  const editable = canEdit("catalog");

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const categoriesQuery = useQuery({ queryKey: ["categories", "all"], queryFn: () => apiClient.categories.list({ pageSize: 200 }) });
  const query = useQuery({
    queryKey: ["products", { search, categoryId }],
    queryFn: () =>
      apiClient.products.list({
        search: search || undefined,
        categoryId: categoryId === "all" ? undefined : categoryId,
        pageSize: 200,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.products.remove(id),
    onSuccess: () => {
      toast.success("Товар видалено");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const items = query.data?.items ?? [];
  const categoryItems = [
    { value: "all", label: "Усі категорії" },
    ...(categoriesQuery.data?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{messages.nav.products}</h1>
          <p className="text-sm text-muted-foreground">Товари каталогу.</p>
        </div>
        {editable ? (
          <GuardedLink href="/catalog/products/new" className={cn(buttonVariants(), "hidden md:inline-flex")}>
            <Plus className="size-4" />
            {messages.actions.create}
          </GuardedLink>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Пошук…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 flex-1 sm:max-w-xs" />
        <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "all")} items={categoryItems}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryItems.map((i) => (
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
            {items.map((product) => (
              <GuardedLink key={product.id} href={`/catalog/products/${product.id}`} className="block">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{product.title}</p>
                      {product.featured ? <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" /> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">
                        {product.price} {product.currency}
                      </span>
                      <Badge variant="outline">{STOCK_STATUS_LABELS[product.stockStatus]}</Badge>
                      {!product.active ? <Badge variant="secondary">Вимкнено</Badge> : null}
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
                  <TableHead>Назва</TableHead>
                  <TableHead>Ціна</TableHead>
                  <TableHead>Наявність</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <GuardedLink href={`/catalog/products/${product.id}`} className="flex items-center gap-1.5 font-medium">
                        {product.featured ? <Star className="size-3.5 fill-amber-400 text-amber-400" /> : null}
                        {product.title}
                      </GuardedLink>
                    </TableCell>
                    <TableCell>
                      {product.price} {product.currency}
                    </TableCell>
                    <TableCell>{STOCK_STATUS_LABELS[product.stockStatus]}</TableCell>
                    <TableCell>
                      <Badge variant={product.active ? "outline" : "secondary"}>{product.active ? "Активний" : "Вимкнено"}</Badge>
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
                            setPendingDelete(product);
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
          href="/catalog/products/new"
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
        title="Видалити товар?"
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
