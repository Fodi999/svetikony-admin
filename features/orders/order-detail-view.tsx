"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Copy, Mail, Phone, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { TextField } from "@/components/forms/text-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderStatusBadge } from "@/features/orders/order-status-badge";
import { isCancellable, isTerminal, NEXT_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from "@/features/orders/order-status-labels";
import { StateMessage } from "@/components/feedback/state-message";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnreadOrders } from "@/features/orders/use-unread-orders";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { messages } from "@/lib/i18n";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { formatCents } from "@/lib/utils/format-money";
import { orderNoteSchema, type OrderNoteFormValues } from "@/lib/validation/order.schema";
import type { Order, OrderStatus } from "@/types/entities";

/** What was actually ordered — prefers the icon snapshot, falls back to
 * the primary product snapshot, matching svet-ikony's own two order-
 * creation paths (createIconOrder / createProductOrder). Always real
 * historical snapshots, never a live Product/Icon lookup — see the
 * Phase 2B-5B report's ORDER SNAPSHOT DISPLAY section. */
function primaryTargetLabel(order: Order): string | null {
  if (order.iconTitleSnapshot) return order.iconTitleSnapshot;
  if (order.primaryProductNameSnapshot) return order.primaryProductNameSnapshot;
  return null;
}

function confirmDialogContent(order: Order, pendingStatus: OrderStatus) {
  if (pendingStatus === "cancelled") {
    return {
      title: "Скасувати замовлення?",
      description: `Замовлення ${order.orderNumber} буде позначено як скасоване.`,
      destructive: true,
      confirmLabel: "Скасувати замовлення",
    };
  }
  return {
    title: "Повернути замовлення в роботу?",
    description: `Замовлення ${order.orderNumber} наразі має статус «${ORDER_STATUS_LABELS[order.status]}». Змінити на «${ORDER_STATUS_LABELS[pendingStatus]}»?`,
    destructive: false,
    confirmLabel: "Змінити статус",
  };
}

export function OrderDetailView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { setDirty } = useUnsavedChanges();
  const { refreshUnreadOrders } = useUnreadOrders();
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const markReadRequestedForId = useRef<string | null>(null);

  const query = useQuery({ queryKey: ["orders", id], queryFn: () => apiClient.orders.get(id) });
  const order = query.data;

  const noteForm = useForm<OrderNoteFormValues>({
    resolver: zodResolver(orderNoteSchema),
    values: order ? { adminNote: order.adminNote ?? "" } : undefined,
  });

  useEffect(() => {
    const subscription = noteForm.watch(() => setDirty(noteForm.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [noteForm, setDirty]);

  useBeforeUnloadWarning(noteForm.formState.isDirty);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  }

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => apiClient.orders.updateStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success("Статус оновлено");
      setPendingStatus(null);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const noteMutation = useMutation({
    mutationFn: (values: OrderNoteFormValues) => apiClient.orders.updateNote(id, values.adminNote ?? ""),
    onSuccess: () => {
      invalidate();
      toast.success("Нотатку збережено");
      noteForm.reset(noteForm.getValues());
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const markReadMutation = useMutation({
    mutationFn: () => apiClient.orders.markRead(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["orders", id], updated);
      invalidate();
      refreshUnreadOrders();
    },
    onError: (error) => {
      toast.error(errorMessageFor(error));
    },
  });

  /** Opening a specific unread order's detail view marks it read exactly
   * once per order id -- never from list rendering, search/filter, or just
   * visiting /orders (see order-list-view.tsx, which never calls this).
   * Keyed by order id (not a plain boolean) so this still fires correctly
   * if the admin navigates from one order straight to another without this
   * component unmounting, but a refetch of the *same* order (e.g. from an
   * unrelated invalidate() while this page is open, or a failed attempt)
   * never re-triggers it. */
  useEffect(() => {
    if (order && !order.isRead && markReadRequestedForId.current !== order.id) {
      markReadRequestedForId.current = order.id;
      markReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  /** Every status change (quick action or dropdown) goes through here.
   * Confirmation is required in exactly two cases (your decision, not
   * invented): moving TO cancelled, or moving AWAY from an already-
   * terminal status (completed/cancelled) — see isTerminal(). A normal
   * forward quick-action never triggers either condition, since its
   * target is never 'cancelled' and its source is never terminal by
   * construction (NEXT_STATUS has no entry for completed/cancelled). */
  function requestStatusChange(next: OrderStatus) {
    if (!order || next === order.status) return;
    if (next === "cancelled" || isTerminal(order.status)) {
      setPendingStatus(next);
      return;
    }
    statusMutation.mutate(next);
  }

  function copyNumber() {
    if (!order) return;
    navigator.clipboard.writeText(order.orderNumber);
    toast.success("Номер скопійовано");
  }

  if (query.isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (query.isError || !order) {
    return (
      <div className="p-4">
        <StateMessage
          variant="error"
          title={messages.states.errorTitle}
          description={query.error ? errorMessageFor(query.error) : undefined}
          action={{ label: messages.actions.retry, onClick: () => query.refetch() }}
        />
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[order.status];
  const targetLabel = primaryTargetLabel(order);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{order.orderNumber}</h1>
            <Button variant="ghost" size="icon" className="size-8" onClick={copyNumber} aria-label={messages.actions.copy}>
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {!order.isRead ? <Badge className="bg-primary text-primary-foreground">Непрочитано</Badge> : null}
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Клієнт</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{order.customerName}</p>
            <div className="flex flex-wrap gap-2">
              {order.contactMethod === "email" ? (
                <Button variant="outline" size="sm" nativeButton={false} render={<a href={`mailto:${order.contactValue}`} />}>
                  <Mail className="size-3.5" />
                  {order.contactValue}
                </Button>
              ) : (
                <Button variant="outline" size="sm" nativeButton={false} render={<a href={`tel:${order.contactValue}`} />}>
                  <Phone className="size-3.5" />
                  {order.contactValue}
                </Button>
              )}
            </div>
            {order.country || order.city ? (
              <p className="text-muted-foreground">{[order.country, order.city].filter(Boolean).join(", ")}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Що замовлено</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {targetLabel ? <p className="font-medium">{targetLabel}</p> : null}
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>
                  {item.optionNameSnapshot} × {item.quantity}
                </span>
                <span className="font-medium">{formatCents(item.priceCentsSnapshot * item.quantity, order.currency)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-2 font-semibold">
              <span>Разом</span>
              <span>{formatCents(order.totalPriceCents, order.currency)}</span>
            </div>
          </CardContent>
        </Card>

        {order.comment ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Коментар клієнта</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{order.comment}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Статус замовлення</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {nextStatus ? (
                <Button type="button" size="sm" disabled={statusMutation.isPending} onClick={() => requestStatusChange(nextStatus)}>
                  {ORDER_STATUS_LABELS[nextStatus]}
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : null}
              {isCancellable(order.status) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={statusMutation.isPending}
                  onClick={() => requestStatusChange("cancelled")}
                >
                  <XCircle className="size-3.5" />
                  Скасувати
                </Button>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Змінити статус вручну</p>
              <Select
                value={order.status}
                onValueChange={(value) => requestStatusChange(value as OrderStatus)}
                items={ORDER_STATUS_OPTIONS}
                disabled={statusMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Внутрішня нотатка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Видно лише команді — клієнт її не бачить.</p>
            <TextField control={noteForm.control} name="adminNote" label="Текст нотатки" textarea rows={3} />
            <Button
              type="button"
              size="sm"
              disabled={noteMutation.isPending || !noteForm.formState.isDirty}
              onClick={noteForm.handleSubmit((values) => noteMutation.mutate(values))}
            >
              Зберегти нотатку
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        {...(pendingStatus ? confirmDialogContent(order, pendingStatus) : { title: "" })}
        onConfirm={() => pendingStatus && statusMutation.mutate(pendingStatus)}
      />
    </div>
  );
}
