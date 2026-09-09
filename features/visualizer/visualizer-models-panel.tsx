"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ModelViewerPreview } from "@/components/forms/model-viewer-preview";
import { MediaUploadButton, type UploadedMedia } from "@/components/forms/media-upload-button";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { visualizerPreviewUrl } from "@/lib/media/visualizer-preview-url";
import type { VisualizerModel } from "@/types/entities";

function LibraryPreview({ model }: { model: VisualizerModel }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(!open)}>
        {open ? "Закрити 3D-перегляд" : "Переглянути 3D"}
      </Button>
      {open ? (
        <ModelViewerPreview
          src={visualizerPreviewUrl(model.id, model.updatedAt)}
          alt={model.filename}
        />
      ) : null}
    </div>
  );
}

export function VisualizerModelsPanel({
  mode,
  eventGroupId,
  editable = true,
}: {
  mode: "base" | "event" | "library";
  eventGroupId?: string;
  editable?: boolean;
}) {
  const client = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<VisualizerModel | null>(null);
  const query = useQuery({
    queryKey: ["visualizerModels", "all"],
    queryFn: () => apiClient.visualizerModels.list(),
  });
  const all = query.data ?? [];
  const base = all.find((model) => model.isBaseEarth);
  const models =
    mode === "base"
      ? base
        ? [base]
        : []
      : mode === "event"
        ? all.filter((model) => model.eventGroupId === eventGroupId && !model.isBaseEarth)
        : all;
  const refresh = () => client.invalidateQueries({ queryKey: ["visualizerModels"] });
  const remove = useMutation({
    mutationFn: (model: VisualizerModel) =>
      apiClient.visualizerModels.remove(model.id, { force: model.isBaseEarth }),
    onSuccess: () => {
      toast.success("Модель видалено");
      void refresh();
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });
  const setBase = useMutation({
    mutationFn: (id: string) => apiClient.visualizerModels.setBaseEarth(id),
    onSuccess: () => {
      toast.success("Основну Землю обрано");
      void refresh();
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });
  async function saveUpload(upload: UploadedMedia, previous?: VisualizerModel) {
    const metadata = {
      r2Key: upload.id,
      filename: upload.filename,
      mimeType: upload.mimeType,
      fileSize: upload.fileSize,
      title: previous?.title || upload.filename,
    };
    try {
      const model = previous
        ? await apiClient.visualizerModels.update(previous.id, metadata)
        : await apiClient.visualizerModels.create({
            ...metadata,
            eventGroupId: mode === "event" ? eventGroupId : undefined,
          });
      if (mode === "base" && !model.isBaseEarth)
        await apiClient.visualizerModels.setBaseEarth(model.id);
      await refresh();
    } catch (error) {
      // The upstream reference guard preserves a file if metadata was saved
      // but a later step (such as selecting it as Earth) failed.
      try {
        await apiClient.media.remove(upload.id);
      } catch {
        /* retained safely */
      }
      await refresh();
      throw error;
    }
  }
  const entityId = mode === "event" ? eventGroupId : "earth-base";
  return (
    <section className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {mode === "base" ? "Основна модель Землі" : "3D-моделі"}
          </h2>
          <p className="text-muted-foreground text-sm">
            GLB з Blender · до 50 МБ · ресурси та текстури всередині файлу
          </p>
        </div>
        {editable && entityId && !(mode === "base" && base) ? (
          <MediaUploadButton
            kind="model"
            module="visualizer"
            entityId={entityId}
            purpose="model"
            onUploaded={(upload) => saveUpload(upload)}
          />
        ) : null}
      </div>
      {query.isPending ? (
        <p role="status">Завантаження моделей…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{errorMessageFor(query.error)}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Повторити
          </Button>
        </div>
      ) : null}
      {!query.isPending && !query.isError && !models.length ? (
        <p className="text-muted-foreground text-sm">
          {mode === "base"
            ? "Використовується вбудований глобус. Завантажте власну Землю, щоб замінити його."
            : "Моделі ще не додано."}
        </p>
      ) : null}
      <div className={mode === "library" ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
        {models.map((model) => (
          <article key={model.id} className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium break-all">
                  {model.title || model.filename || "3D-модель"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {model.isBaseEarth ? "Основна Земля · " : ""}
                  {((model.fileSize ?? 0) / 1024 / 1024).toFixed(2)} МБ ·{" "}
                  {model.mimeType || "model/gltf-binary"}
                </p>
              </div>
              {editable ? (
                <div className="flex flex-wrap gap-2">
                  <MediaUploadButton
                    kind="model"
                    module="visualizer"
                    entityId={model.eventGroupId || "earth-base"}
                    purpose="model"
                    label="Замінити"
                    onUploaded={(upload) => saveUpload(upload, model)}
                  />
                  {!model.isBaseEarth && !model.eventGroupId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={setBase.isPending}
                      onClick={() => setBase.mutate(model.id)}
                    >
                      Зробити основною Землею
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => setPendingDelete(model)}
                  >
                    Видалити
                  </Button>
                </div>
              ) : null}
            </div>
            {mode === "library" ? (
              <LibraryPreview model={model} />
            ) : (
              <ModelViewerPreview
                src={visualizerPreviewUrl(model.id, model.updatedAt)}
                alt={model.filename}
              />
            )}
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Видалити 3D-модель?"
        description={
          pendingDelete?.isBaseEarth
            ? "Замість цієї Землі відвідувачі бачитимуть вбудований глобус."
            : "Файл буде видалено лише якщо він більше ніде не використовується."
        }
        destructive
        confirmLabel="Видалити"
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </section>
  );
}
