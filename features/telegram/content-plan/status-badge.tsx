import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentPlanSlotStatus } from "@/types/entities";

export const STATUS_LABELS: Record<ContentPlanSlotStatus, string> = {
  SENT: "Опубліковано",
  SENDING: "Публікується…",
  READY: "Готово до публікації",
  DRAFT: "Чернетка",
  SOURCE_READY: "Є джерело",
  MISSING_SOURCE: "Немає джерела",
  REVIEW_REQUIRED: "Потрібна перевірка",
  FAILED: "Помилка",
};

/** Explicit Tailwind color classes rather than Badge's stock variants --
 * the task specifies an exact palette (blue/green/yellow/gray/red-orange)
 * that doesn't map 1:1 onto shadcn's default/secondary/destructive/outline
 * set. Dark-theme-safe: each uses a translucent background + matching
 * text tone rather than a solid fill. */
const STATUS_CLASSNAMES: Record<ContentPlanSlotStatus, string> = {
  SENT: "border-blue-500/30 bg-blue-500/15 text-blue-400",
  SENDING: "border-blue-500/30 bg-blue-500/15 text-blue-400 animate-pulse",
  READY: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  SOURCE_READY: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500/90",
  DRAFT: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  MISSING_SOURCE: "border-border bg-muted text-muted-foreground",
  REVIEW_REQUIRED: "border-orange-500/30 bg-orange-500/15 text-orange-400",
  FAILED: "border-red-500/30 bg-red-500/15 text-red-400",
};

export function StatusBadge({ status, className }: { status: ContentPlanSlotStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_CLASSNAMES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
