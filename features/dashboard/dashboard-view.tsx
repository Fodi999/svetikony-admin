"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileWarning, ImageOff, Languages, PenLine, ShoppingBag, Volume2 } from "lucide-react";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { StatTile } from "@/features/dashboard/stat-tile";
import { StateMessage } from "@/components/feedback/state-message";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { messages } from "@/lib/i18n";

export function DashboardView() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiClient.dashboard.getStats(),
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Вітаємо, {user?.name.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground">Огляд стану контенту та замовлень.</p>
      </div>

      <QuickActions />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <StateMessage
          variant="error"
          title={messages.states.errorTitle}
          description={errorMessageFor(error)}
          action={{ label: messages.actions.retry, onClick: () => refetch() }}
        />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Нові замовлення" value={data.newOrders} icon={ShoppingBag} href="/orders" tone="warning" />
            <StatTile label="Непрочитані замовлення" value={data.unreadOrders} icon={ShoppingBag} href="/orders" tone="warning" />
            <StatTile label="Чернетки" value={data.drafts} icon={PenLine} />
            <StatTile label="Опубліковано" value={data.published} icon={CalendarDays} tone="success" />
            <StatTile label="Без перекладу" value={data.missingTranslations} icon={Languages} tone="warning" />
            <StatTile label="Без зображення" value={data.missingImages} icon={ImageOff} tone="warning" />
            <StatTile label="Молитви без аудіо" value={data.prayersWithoutAudio} icon={Volume2} href="/prayers" tone="warning" />
            <StatTile label="Помилки завантаження медіа" value={data.mediaUploadErrors} icon={FileWarning} href="/media" tone="warning" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Найближчі дні в календарі</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.upcomingCalendarDays.length === 0 ? (
                <p className="text-sm text-muted-foreground">Найближчих подій немає.</p>
              ) : (
                data.upcomingCalendarDays.map((day) => (
                  <div key={day.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{day.title}</p>
                      <p className="text-xs text-muted-foreground">{day.date}</p>
                    </div>
                    <StatusBadge status={day.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
