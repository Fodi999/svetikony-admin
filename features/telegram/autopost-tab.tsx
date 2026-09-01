"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { StateMessage } from "@/components/feedback/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { autopostSettingsSchema, type AutopostSettingsFormValues } from "@/lib/validation/telegram.schema";
import { AUTOPOST_CONTENT_TYPE_LABELS, AUTOPOST_CONTENT_TYPES, type TelegramPost, type TelegramPostStatus } from "@/types/entities";

const STATUS_LABELS: Record<TelegramPostStatus, string> = {
  draft: "Чернетка",
  scheduled: "Заплановано",
  sent: "Надіслано",
  failed: "Помилка",
};

const STATUS_VARIANTS: Record<TelegramPostStatus, "outline" | "default" | "destructive" | "secondary"> = {
  draft: "outline",
  scheduled: "secondary",
  sent: "default",
  failed: "destructive",
};

/** A row that failed calendar verification (saint_of_day only) is stored
 * with status='failed' + verificationStatus='failed' -- surfaced here as
 * its own clear, non-technical label instead of a generic "Помилка", since
 * it means something structurally different (the day's saint could not be
 * confirmed against independent sources, not a Telegram/OpenAI error) and
 * cannot be retried the same way (see the publish route's own refusal to
 * retry an unverified row). */
function displayStatusLabel(post: Pick<TelegramPost, "status" | "verificationStatus">): string {
  if (post.status === "failed" && post.verificationStatus === "failed") return "Не пройшов перевірку календаря";
  return STATUS_LABELS[post.status];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("uk-UA");
}

function nowKyivHhMm(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

/** Simple display-only "next run" estimate: lexicographic HH:MM comparison
 * is safe here because both sides are always zero-padded 'HH:MM'. This is
 * not the due-check itself — that lives server-side in
 * svet-ikony's lib/telegram/autopost.ts. */
function nextRunLabel(scheduleTime: string, enabled: boolean): string {
  if (!enabled) return "Вимкнено";
  const isLaterToday = scheduleTime > nowKyivHhMm();
  return isLaterToday ? `сьогодні о ${scheduleTime}` : `завтра о ${scheduleTime}`;
}

export function AutopostTab() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({ queryKey: ["telegram", "autopost", "settings"], queryFn: () => apiClient.telegram.autopost.getSettings() });
  const postsQuery = useQuery({ queryKey: ["telegram", "posts"], queryFn: () => apiClient.telegram.posts.list() });

  const form = useForm<AutopostSettingsFormValues>({
    resolver: zodResolver(autopostSettingsSchema),
    defaultValues: { globalEnabled: false, items: AUTOPOST_CONTENT_TYPES.map((contentType) => ({ contentType, enabled: true, scheduleTime: "00:00" })) },
  });

  useEffect(() => {
    if (settingsQuery.data) form.reset(settingsQuery.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values: AutopostSettingsFormValues) => apiClient.telegram.autopost.updateSettings(values),
    onSuccess: (result) => {
      form.reset(result);
      toast.success("Налаштування автопублікації збережено");
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => apiClient.telegram.posts.publish(id),
    onSuccess: () => {
      toast.success("Повторна спроба виконана");
      queryClient.invalidateQueries({ queryKey: ["telegram", "posts"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const globalEnabled = form.watch("globalEnabled");
  const items = form.watch("items");
  const autopostHistory = (postsQuery.data ?? []).filter((post) => post.contentType !== null);

  if (settingsQuery.isLoading) {
    return <Skeleton className="mt-4 h-96 rounded-xl" />;
  }
  if (settingsQuery.isError) {
    return (
      <StateMessage
        variant="error"
        title="Не вдалося завантажити налаштування"
        description={errorMessageFor(settingsQuery.error)}
        action={{ label: "Повторити", onClick: () => settingsQuery.refetch() }}
      />
    );
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Автопублікація</CardTitle>
          <div className="flex items-center gap-2">
            <Switch checked={globalEnabled} onCheckedChange={(checked) => form.setValue("globalEnabled", checked, { shouldDirty: true })} />
            <span className="text-sm text-muted-foreground">{globalEnabled ? "Увімкнено" : "Вимкнено"}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Календар:</span>
            <Badge variant="outline">Юліанський (старий стиль)</Badge>
            <span className="ml-2 text-muted-foreground">Мова:</span>
            <Badge variant="outline">Українська</Badge>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Коли увімкнено, бот сам публікує пости за розкладом нижче (час — Europe/Kyiv), без участі адміністратора. Джерело фактів — лише
            церковний календар за старим стилем (юліанським) на відповідний день; якщо даних немає, слот пропускається. Ці налаштування
            календаря та мови зараз незмінні через інтерфейс.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип публікації</TableHead>
                  <TableHead>Увімкнено</TableHead>
                  <TableHead>Час (Kyiv)</TableHead>
                  <TableHead>Наступний запуск</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.contentType}>
                    <TableCell className="font-medium">{AUTOPOST_CONTENT_TYPE_LABELS[item.contentType]}</TableCell>
                    <TableCell>
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(checked) => form.setValue(`items.${index}.enabled`, checked, { shouldDirty: true })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input type="time" className="w-28" {...form.register(`items.${index}.scheduleTime`)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{nextRunLabel(item.scheduleTime, item.enabled && globalEnabled)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Збереження…" : "Зберегти налаштування"}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Історія автоматичних публікацій</CardTitle>
        </CardHeader>
        <CardContent>
          {postsQuery.isLoading ? (
            <Skeleton className="h-40 rounded-lg" />
          ) : postsQuery.isError ? (
            <StateMessage variant="error" title="Помилка" description={errorMessageFor(postsQuery.error)} />
          ) : autopostHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Автопублікацій ще не було.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Перевірка календаря</TableHead>
                    <TableHead>Текст</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {autopostHistory.map((post) => {
                    const verificationFailed = post.status === "failed" && post.verificationStatus === "failed";
                    return (
                      <TableRow key={post.id}>
                        <TableCell>{post.contentType ? AUTOPOST_CONTENT_TYPE_LABELS[post.contentType] : "—"}</TableCell>
                        <TableCell>{post.publishDate ?? formatDate(post.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[post.status]}>{displayStatusLabel(post)}</Badge>
                          {post.status === "failed" && post.errorMessage ? (
                            <p className="mt-1 max-w-xs truncate text-xs text-destructive">{post.errorMessage}</p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {post.verificationStatus === "verified" ? (
                            <Badge variant="default">Перевірено</Badge>
                          ) : post.verificationStatus === "failed" ? (
                            <Badge variant="destructive">Не пройшла</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{post.text || "—"}</TableCell>
                        <TableCell>
                          {post.status === "failed" && !verificationFailed ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label="Повторити"
                              disabled={retryMutation.isPending}
                              onClick={() => retryMutation.mutate(post.id)}
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
