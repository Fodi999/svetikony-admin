"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, Phone } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SelectField } from "@/components/forms/select-field";
import { SwitchField } from "@/components/forms/switch-field";
import { TextField } from "@/components/forms/text-field";
import { OrderStatusBadge } from "@/features/orders/order-status-badge";
import { StateMessage } from "@/components/feedback/state-message";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { messages } from "@/lib/i18n";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { orderUpdateSchema, type OrderUpdateFormValues } from "@/lib/validation/order.schema";

const ORDER_TYPE_LABELS: Record<string, string> = {
  icon_order: "Замовлення ікони",
  product_order: "Замовлення товару",
  custom_request: "Індивідуальний запит",
};

export function OrderDetailView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { setDirty } = useUnsavedChanges();

  const query = useQuery({ queryKey: ["orders", id], queryFn: () => apiClient.orders.get(id) });

  const form = useForm<OrderUpdateFormValues>({
    resolver: zodResolver(orderUpdateSchema),
    values: query.data ? { status: query.data.status, isRead: query.data.isRead, internalNote: query.data.internalNote ?? "" } : undefined,
  });

  useEffect(() => {
    const subscription = form.watch(() => setDirty(form.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [form, setDirty]);

  useBeforeUnloadWarning(form.formState.isDirty);

  const updateMutation = useMutation({
    mutationFn: (values: OrderUpdateFormValues) => apiClient.orders.updateStatus(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Замовлення оновлено");
      setDirty(false);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  async function handleSave() {
    const valid = await form.trigger();
    if (!valid) return;
    updateMutation.mutate(form.getValues());
  }

  function copyNumber() {
    if (!query.data) return;
    navigator.clipboard.writeText(query.data.number);
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

  if (query.isError || !query.data) {
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

  const order = query.data;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28 md:p-6 md:pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{order.number}</h1>
            <Button variant="ghost" size="icon" className="size-8" onClick={copyNumber} aria-label={messages.actions.copy}>
              <Copy className="size-4" />
            </Button>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Клієнт</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{order.customerName}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={`tel:${order.phone}`} />}>
                <Phone className="size-3.5" />
                {order.phone}
              </Button>
              {order.email ? (
                <Button variant="outline" size="sm" nativeButton={false} render={<a href={`mailto:${order.email}`} />}>
                  <Mail className="size-3.5" />
                  {order.email}
                </Button>
              ) : null}
            </div>
            <p className="text-muted-foreground">{ORDER_TYPE_LABELS[order.orderType]}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Позиції замовлення</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>
                  {item.title} × {item.quantity}
                </span>
                <span className="font-medium">
                  {item.unitPrice * item.quantity} {item.currency}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-2 font-semibold">
              <span>Разом</span>
              <span>
                {order.amount} {order.currency}
              </span>
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
            <CardTitle className="text-base">Керування</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SelectField
              control={form.control}
              name="status"
              label="Статус"
              options={[
                { value: "new", label: "Нове" },
                { value: "in_progress", label: "В роботі" },
                { value: "completed", label: "Виконано" },
                { value: "cancelled", label: "Скасовано" },
              ]}
            />
            <SwitchField control={form.control} name="isRead" label="Прочитано" />
            <TextField control={form.control} name="internalNote" label="Внутрішня примітка" textarea rows={3} />
          </CardContent>
        </Card>

        {order.statusHistory.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Історія статусів</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.statusHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <OrderStatusBadge status={entry.status} />
                  <span className="text-muted-foreground">{new Date(entry.changedAt).toLocaleString("uk-UA")}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 bottom-16 z-20 border-t bg-background p-3 md:sticky md:bottom-0 md:inset-x-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <Button type="button" className="h-11 w-full" disabled={updateMutation.isPending} onClick={handleSave}>
          {messages.actions.save}
        </Button>
      </div>
    </div>
  );
}
