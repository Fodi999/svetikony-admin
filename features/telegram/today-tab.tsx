"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { StateMessage } from "@/components/feedback/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { PostForm } from "./post-form";

/** Mirrors assistant/src/interfaces/telegram/commands.rs's format_today —
 * same shape of summary, built client-side here since the composer needs
 * editable plain text, not the bot's own pre-formatted message. */
function assemblePreviewText(data: {
  calendarDay: { title: string; description: string } | null;
  saint: { name: string } | null;
  prayer: { title: string } | null;
  gospel: { title: string; reference: string } | null;
}): string {
  if (!data.calendarDay) return "";
  let text = `☦️ ${data.calendarDay.title}`;
  if (data.calendarDay.description) text += `\n${data.calendarDay.description}`;
  if (data.saint) text += `\n\n🕯 Святий дня: ${data.saint.name}`;
  if (data.prayer) text += `\n🙏 Молитва: ${data.prayer.title}`;
  if (data.gospel) text += `\n📖 Євангеліє: ${data.gospel.title} (${data.gospel.reference})`;
  return text;
}

export function TodayTab() {
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);

  const query = useQuery({ queryKey: ["telegram", "today"], queryFn: () => apiClient.telegram.getToday() });

  if (query.isLoading) {
    return (
      <div className="mt-4 space-y-3">
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
        title="Не вдалося завантажити дані на сьогодні"
        description={errorMessageFor(query.error)}
        action={{ label: "Повторити", onClick: () => query.refetch() }}
      />
    );
  }

  const { calendarDay, saint, prayer, gospel, article, imageUrl } = query.data;

  if (!calendarDay) {
    return <StateMessage variant="empty" title="На сьогодні немає запису" description="Церковний календар ще не містить запису на сьогоднішню дату." />;
  }

  return (
    <div className="mt-4 space-y-4">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary R2/church content image
        <img src={imageUrl} alt="" className="h-48 w-full rounded-xl border object-cover" />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{calendarDay.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{calendarDay.description || "—"}</CardContent>
      </Card>

      {saint ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🕯 {saint.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{saint.shortDescription}</CardContent>
        </Card>
      ) : null}

      {prayer ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🙏 {prayer.title}</CardTitle>
          </CardHeader>
          <CardContent className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{prayer.text}</CardContent>
        </Card>
      ) : null}

      {gospel ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              📖 {gospel.title} ({gospel.reference})
            </CardTitle>
          </CardHeader>
          <CardContent className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{gospel.text}</CardContent>
        </Card>
      ) : null}

      {article ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📚 {article.title}</CardTitle>
          </CardHeader>
          <CardContent className="line-clamp-3 text-sm text-muted-foreground">{article.content}</CardContent>
        </Card>
      ) : null}

      <Button onClick={() => setComposerOpen(true)}>
        <Send className="size-4" />
        Зібрати Telegram Preview
      </Button>

      <PostForm
        open={composerOpen}
        onOpenChange={setComposerOpen}
        initialText={assemblePreviewText({ calendarDay, saint, prayer, gospel })}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["telegram", "posts"] })}
      />
    </div>
  );
}
