"use client";

import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/lib/utils/use-online-status";

export function ConnectionStatus({ className }: { className?: string }) {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return (
      <span className={cn("hidden items-center gap-1.5 text-xs text-muted-foreground md:flex", className)}>
        <Wifi className="size-3.5" aria-hidden />
        Онлайн
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400",
        className,
      )}
      role="status"
    >
      <WifiOff className="size-3.5" aria-hidden />
      Офлайн — зміни не збережуться
    </span>
  );
}
