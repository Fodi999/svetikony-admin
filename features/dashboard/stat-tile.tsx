import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "warning" | "success";
}

const TONE_CLASS: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-foreground",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
};

export function StatTile({ label, value, icon: Icon, href, tone = "default" }: StatTileProps) {
  const content = (
    <Card className="h-full transition-colors hover:bg-accent/50">
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={cn("size-8 shrink-0", TONE_CLASS[tone])} aria-hidden />
        <div className="min-w-0">
          <p className={cn("text-2xl font-semibold tabular-nums", TONE_CLASS[tone])}>{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}
