import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-status-labels";
import type { OrderStatus } from "@/types/entities";

const CLASS_NAME: Record<OrderStatus, string> = {
  new: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  contacted: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  confirmed: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
  in_production: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  ready: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
  shipped: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={CLASS_NAME[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
