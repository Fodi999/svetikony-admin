"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ImageIcon, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { telegramPostSchema, type TelegramPostFormValues } from "@/lib/validation/telegram.schema";
import type { TelegramPost } from "@/types/entities";
import { MediaPickerDialog } from "./media-picker-dialog";

interface PostFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing post; omitted when composing a brand-new draft. */
  post?: TelegramPost;
  /** Seeds a fresh draft's text (e.g. from the "Сьогодні" preview). Ignored when `post` is set. */
  initialText?: string;
  onSaved?: () => void;
}

const EMPTY_DEFAULTS: TelegramPostFormValues = { text: "", mediaUrl: "", scheduledAt: "" };

export function PostForm({ open, onOpenChange, post, initialText, onSaved }: PostFormProps) {
  const [savedPost, setSavedPost] = useState<TelegramPost | undefined>(post);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  const form = useForm<TelegramPostFormValues>({
    resolver: zodResolver(telegramPostSchema),
    defaultValues: post
      ? { text: post.text ?? "", mediaUrl: post.mediaUrl ?? "", scheduledAt: post.scheduledAt ?? "" }
      : { ...EMPTY_DEFAULTS, text: initialText ?? "" },
  });

  useEffect(() => {
    if (!open) return;
    setSavedPost(post);
    form.reset(
      post
        ? { text: post.text ?? "", mediaUrl: post.mediaUrl ?? "", scheduledAt: post.scheduledAt ?? "" }
        : { ...EMPTY_DEFAULTS, text: initialText ?? "" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, post?.id]);

  const alreadySent = savedPost?.status === "sent";

  const saveMutation = useMutation({
    mutationFn: (values: TelegramPostFormValues) =>
      savedPost ? apiClient.telegram.posts.update(savedPost.id, values) : apiClient.telegram.posts.create(values),
    onSuccess: (result) => {
      setSavedPost(result);
      toast.success("Чернетку збережено");
      onSaved?.();
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiClient.telegram.posts.publish(id),
    onSuccess: (result) => {
      setSavedPost(result);
      toast.success("Опубліковано в канал");
      onSaved?.();
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const mediaUrl = form.watch("mediaUrl");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{savedPost ? "Редагування публікації" : "Нова публікація"}</DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <TextField
              control={form.control}
              name="text"
              label="Текст"
              textarea
              rows={8}
              disabled={alreadySent}
              placeholder="Текст повідомлення для каналу…"
            />

            <Field>
              <FieldLabel>Зображення</FieldLabel>
              {mediaUrl ? (
                <div className="relative w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary R2-hosted image */}
                  <img src={mediaUrl} alt="" className="h-32 rounded-lg border object-cover" />
                  {!alreadySent ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute -right-2 -top-2 size-6 rounded-full"
                      onClick={() => form.setValue("mediaUrl", "", { shouldDirty: true })}
                      aria-label="Прибрати зображення"
                    >
                      <X className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              ) : (
                <Button type="button" variant="outline" disabled={alreadySent} onClick={() => setPickerOpen(true)}>
                  <ImageIcon className="size-4" />
                  Обрати з медіатеки
                </Button>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="scheduledAt">Запланувати на</FieldLabel>
              <Input
                id="scheduledAt"
                type="datetime-local"
                disabled
                title="Автоматична публікація за розкладом ще не увімкнена — поле лише для підготовки"
                {...form.register("scheduledAt")}
              />
            </Field>

            <Button
              type="button"
              variant="outline"
              disabled
              title="Функція готується"
              className="w-fit"
            >
              <Sparkles className="size-4" />
              Підготувати з ШІ
            </Button>

            <DialogFooter>
              <Button type="submit" variant="secondary" disabled={alreadySent || saveMutation.isPending}>
                {saveMutation.isPending ? "Збереження…" : "Зберегти чернетку"}
              </Button>
              <Button
                type="button"
                disabled={!savedPost || alreadySent || publishMutation.isPending}
                onClick={() => setConfirmPublishOpen(true)}
              >
                {alreadySent ? "Вже опубліковано" : publishMutation.isPending ? "Публікація…" : "Опублікувати зараз"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => form.setValue("mediaUrl", url, { shouldDirty: true })}
      />

      <ConfirmDialog
        open={confirmPublishOpen}
        onOpenChange={setConfirmPublishOpen}
        title="Опублікувати в канал?"
        description="Повідомлення буде надіслано в @svit_ikony негайно. Скасувати публікацію потім не можна."
        confirmLabel="Опублікувати"
        onConfirm={() => {
          if (savedPost) publishMutation.mutate(savedPost.id);
          setConfirmPublishOpen(false);
        }}
      />
    </>
  );
}
