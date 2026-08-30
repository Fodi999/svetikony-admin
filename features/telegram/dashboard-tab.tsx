"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, MessagesSquare, Users } from "lucide-react";
import { StateMessage } from "@/components/feedback/state-message";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { StatTile } from "@/features/dashboard/stat-tile";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("uk-UA");
}

export function DashboardTab() {
  const query = useQuery({
    queryKey: ["telegram", "status"],
    queryFn: () => apiClient.telegram.getStatus(),
    refetchInterval: 30_000,
  });

  if (query.isLoading) {
    return (
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <StateMessage
        variant="error"
        title="Не вдалося завантажити статус"
        description={errorMessageFor(query.error)}
        action={{ label: "Повторити", onClick: () => query.refetch() }}
      />
    );
  }

  const { configured, channel, webhook, stats } = query.data;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Користувачів" value={stats.userCount} icon={Users} />
        <StatTile label="Чатів" value={stats.chatCount} icon={MessagesSquare} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Стан бота</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Бот</span>
            <Badge variant={configured ? "default" : "destructive"}>{configured ? "Налаштований" : "Не налаштований"}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Канал</span>
            <span className="font-medium">{channel ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Webhook</span>
            {webhook ? (
              <span className="flex items-center gap-1.5 font-medium">
                {webhook.lastErrorMessage ? (
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                )}
                {webhook.lastErrorMessage ? "Помилка" : "Активний"}
              </span>
            ) : (
              <Badge variant="destructive">Недоступний</Badge>
            )}
          </div>
          {webhook?.lastErrorMessage ? (
            <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{webhook.lastErrorMessage}</p>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">В очікуванні оновлень</span>
            <span className="font-medium tabular-nums">{webhook?.pendingUpdateCount ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Остання активність</span>
            <span className="font-medium">{formatDate(stats.lastActivityAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
