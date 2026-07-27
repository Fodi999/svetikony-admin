import { CheckCircle2, Archive, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { messages } from "@/lib/i18n";
import type { ContentStatus } from "@/types/entities";

const CONFIG: Record<ContentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  draft: {
    label: messages.status.draft,
    icon: PenLine,
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  published: {
    label: messages.status.published,
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  archived: {
    label: messages.status.archived,
    icon: Archive,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  const config = CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="size-3" aria-hidden />
      {config.label}
    </Badge>
  );
}
