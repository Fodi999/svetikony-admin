import type { LucideIcon } from "lucide-react";
import { AlertTriangle, FileQuestion, Inbox, Lock, ShieldAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StateVariant = "empty" | "error" | "offline" | "unauthorized" | "forbidden" | "notFound";

const ICONS: Record<StateVariant, LucideIcon> = {
  empty: Inbox,
  error: AlertTriangle,
  offline: WifiOff,
  unauthorized: Lock,
  forbidden: ShieldAlert,
  notFound: FileQuestion,
};

interface StateMessageProps {
  variant: StateVariant;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function StateMessage({ variant, title, description, action, className }: StateMessageProps) {
  const Icon = ICONS[variant];
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center",
        className,
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      <Icon className="size-10 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
