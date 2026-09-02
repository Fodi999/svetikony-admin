"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { StateMessage } from "@/components/feedback/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { TelegramPost, TelegramPostStatus } from "@/types/entities";
import { PostForm } from "./post-form";

const STATUS_LABELS: Record<TelegramPostStatus, string> = {
  draft: "Чернетка",
  scheduled: "Заплановано",
  sent: "Надіслано",
  failed: "Помилка",
  ready: "Готово",
  sending: "Надсилається",
};

const STATUS_VARIANTS: Record<TelegramPostStatus, "outline" | "default" | "destructive" | "secondary"> = {
  draft: "outline",
  scheduled: "secondary",
  sent: "default",
  failed: "destructive",
  ready: "secondary",
  sending: "secondary",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("uk-UA");
}

export function PostsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TelegramPost | undefined>(undefined);
  const [composerOpen, setComposerOpen] = useState(false);

  const query = useQuery({ queryKey: ["telegram", "posts"], queryFn: () => apiClient.telegram.posts.list() });

  function openNew() {
    setEditing(undefined);
    setComposerOpen(true);
  }

  function openEdit(post: TelegramPost) {
    setEditing(post);
    setComposerOpen(true);
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Нова публікація
        </Button>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : query.isError ? (
        <StateMessage
          variant="error"
          title="Не вдалося завантажити публікації"
          description={errorMessageFor(query.error)}
          action={{ label: "Повторити", onClick: () => query.refetch() }}
        />
      ) : !query.data || query.data.length === 0 ? (
        <StateMessage variant="empty" title="Ще немає публікацій" description="Створіть чернетку тут або зберіть її з вкладки «Сьогодні»." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Текст</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Заплановано</TableHead>
                <TableHead>Надіслано</TableHead>
                <TableHead>Оновлено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((post) => (
                <TableRow key={post.id} className="cursor-pointer hover:bg-accent/50" onClick={() => openEdit(post)}>
                  <TableCell className="max-w-xs truncate">{post.text || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[post.status]}>{STATUS_LABELS[post.status]}</Badge>
                    {post.status === "failed" && post.errorMessage ? (
                      <p className="mt-1 max-w-xs truncate text-xs text-destructive">{post.errorMessage}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>{post.scheduledAt ? formatDate(post.scheduledAt) : "—"}</TableCell>
                  <TableCell>{post.sentAt ? formatDate(post.sentAt) : "—"}</TableCell>
                  <TableCell>{formatDate(post.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PostForm
        open={composerOpen}
        onOpenChange={setComposerOpen}
        post={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["telegram", "posts"] })}
      />
    </div>
  );
}
