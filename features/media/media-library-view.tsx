"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioLines, FileWarning, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { StateMessage } from "@/components/feedback/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { messages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/types/entities";

const MAX_SIZE_BYTES = 15 * 1024 * 1024;
const ACCEPTED = "image/*,audio/*";

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "error" | "done";
  errorMessage?: string;
}

export function MediaLibraryView() {
  const { canEdit } = useAuth();
  const editable = canEdit("media");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [pendingDelete, setPendingDelete] = useState<MediaAsset | null>(null);

  const query = useQuery({ queryKey: ["media"], queryFn: () => apiClient.media.list() });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.media.remove(id),
    onSuccess: () => {
      toast.success("Файл видалено");
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  function validateFile(file: File): string | null {
    if (!file.type.startsWith("image/") && !file.type.startsWith("audio/")) {
      return "Дозволені лише зображення та аудіо";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "Максимальний розмір файлу — 15 МБ";
    }
    return null;
  }

  async function uploadFile(file: File) {
    const taskId = `${file.name}-${Date.now()}`;
    const validationError = validateFile(file);
    if (validationError) {
      setTasks((prev) => [...prev, { id: taskId, name: file.name, progress: 0, status: "error", errorMessage: validationError }]);
      return;
    }

    setTasks((prev) => [...prev, { id: taskId, name: file.name, progress: 0, status: "uploading" }]);
    try {
      await apiClient.media.upload(file, (progress) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress } : t)));
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "done", progress: 100 } : t)));
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success(`${file.name} завантажено`);
      setTimeout(() => setTasks((prev) => prev.filter((t) => t.id !== taskId)), 2000);
    } catch (error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "error", errorMessage: errorMessageFor(error) } : t)));
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => uploadFile(file));
  }

  function retryTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  const items = query.data ?? [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">{messages.nav.media}</h1>
        <p className="text-sm text-muted-foreground">Медіатека: зображення та аудіо.</p>
      </div>

      {editable ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-border",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <Upload className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Перетягніть файли сюди або</p>
          <Button type="button" onClick={() => fileInputRef.current?.click()}>
            Обрати файл
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">Зображення та аудіо, до 15 МБ</p>
        </div>
      ) : null}

      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="space-y-2 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{task.name}</span>
                  {task.status === "error" ? (
                    <Button variant="ghost" size="sm" onClick={() => retryTask(task.id)}>
                      {messages.actions.retry}
                    </Button>
                  ) : null}
                </div>
                {task.status === "error" ? (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <FileWarning className="size-3.5" /> {task.errorMessage}
                  </p>
                ) : (
                  <Progress value={task.progress} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <StateMessage variant="empty" title={messages.states.emptyTitle} description="Завантажте перший файл, щоб почати." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {items.map((asset) => (
            <Card key={asset.id} className="relative overflow-hidden">
              <CardContent className="flex flex-col items-center gap-2 p-3">
                {asset.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt={asset.alt ?? asset.name} className="h-20 w-full rounded-md object-cover" />
                ) : (
                  <div className="flex h-20 w-full items-center justify-center rounded-md bg-muted">
                    <AudioLines className="size-8 text-muted-foreground" />
                  </div>
                )}
                <p className="line-clamp-1 w-full text-center text-xs text-muted-foreground">{asset.name}</p>
                {editable ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 size-7 bg-background/80 text-destructive"
                    aria-label="Видалити"
                    onClick={() => setPendingDelete(asset)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Видалити файл?"
        description={pendingDelete ? `«${pendingDelete.name}» буде видалено безповоротно.` : undefined}
        destructive
        confirmLabel={messages.actions.delete}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
