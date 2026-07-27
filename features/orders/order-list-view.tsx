"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, Search } from "lucide-react";
import { useState } from "react";
import { OrderStatusBadge } from "@/features/orders/order-status-badge";
import { StateMessage } from "@/components/feedback/state-message";
import { GuardedLink } from "@/components/layout/guarded-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/entities";

type FilterValue = OrderStatus | "unread" | "all";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Усі" },
  { value: "new", label: "Нові" },
  { value: "unread", label: "Непрочитані" },
  { value: "in_progress", label: "В роботі" },
  { value: "completed", label: "Виконані" },
  { value: "cancelled", label: "Скасовані" },
];

export function OrderListView() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  const query = useQuery({
    queryKey: ["orders", { search, filter }],
    queryFn: () =>
      apiClient.orders.list({
        search: search || undefined,
        status: filter === "all" ? undefined : filter,
        pageSize: 200,
      }),
  });

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">{messages.nav.orders}</h1>
        <p className="text-sm text-muted-foreground">Замовлення з сайту.</p>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Пошук за номером, іменем, телефоном, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-full border px-3 text-sm font-medium",
              filter === f.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
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
        <>
          {/* Mobile: cards, unread first via API sort (newest first already prioritizes new orders) */}
          <div className="space-y-3 md:hidden">
            {items.map((order) => (
              <GuardedLink key={order.id} href={`/orders/${order.id}`} className="block">
                <Card className={cn("transition-colors hover:bg-accent/50", !order.isRead && "border-primary/40 bg-primary/5")}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn("font-medium", !order.isRead && "font-semibold")}>{order.number}</p>
                        <p className="text-sm text-muted-foreground">{order.customerName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {!order.isRead ? <Badge className="bg-primary text-primary-foreground">Непрочитано</Badge> : null}
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {order.amount} {order.currency}
                      </span>
                      <span className="text-muted-foreground">{order.items.length} поз.</span>
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
                  <TableHead>Номер</TableHead>
                  <TableHead>Клієнт</TableHead>
                  <TableHead>Контакти</TableHead>
                  <TableHead>Сума</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((order) => (
                  <TableRow key={order.id} className={cn(!order.isRead && "bg-primary/5")}>
                    <TableCell>
                      <GuardedLink href={`/orders/${order.id}`} className="flex items-center gap-1.5 font-medium">
                        {!order.isRead ? <span className="size-2 rounded-full bg-primary" /> : null}
                        {order.number}
                      </GuardedLink>
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="size-3" /> {order.phone}
                      </div>
                      {order.email ? (
                        <div className="flex items-center gap-1">
                          <Mail className="size-3" /> {order.email}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {order.amount} {order.currency}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("uk-UA")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
