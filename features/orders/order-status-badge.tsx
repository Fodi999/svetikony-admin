import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/entities";

const CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  new: { label: "Нове", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  in_progress: { label: "В роботі", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  completed: { label: "Виконано", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Скасовано", className: "bg-muted text-muted-foreground border-border" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = CONFIG[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
