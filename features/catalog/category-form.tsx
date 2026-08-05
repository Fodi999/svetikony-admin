"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { NumberField } from "@/components/forms/number-field";
import { SwitchField } from "@/components/forms/switch-field";
import { TextField } from "@/components/forms/text-field";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { applyApiFieldErrors } from "@/lib/api/errors";
import { messages } from "@/lib/i18n";
import { productCategorySchema, type ProductCategoryFormValues } from "@/lib/validation/category.schema";
import type { ProductCategory } from "@/types/entities";

const EMPTY_DEFAULTS: ProductCategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  imageId: undefined,
  order: 0,
  active: true,
};

/** Best-effort orphan cleanup for a not-yet-saved upload. No-op in mock
 * mode (nothing real to clean up) — same real-mode detection
 * MediaUploadButton uses. */
async function cleanupOrphanUpload(key: string) {
  if (!apiClient.media.uploadObject) return;
  try {
    await apiClient.media.remove(key);
  } catch {
    // Best-effort; nothing to do if it fails.
  }
}

interface CategoryFormProps {
  mode: "create" | "edit";
  category?: ProductCategory;
  onSubmit: (values: ProductCategoryFormValues) => Promise<void>;
  onDelete?: () => void;
  submitting?: boolean;
}

export function CategoryForm({ mode, category, onSubmit, onDelete, submitting }: CategoryFormProps) {
  const { setDirty } = useUnsavedChanges();
  const [previewOpen, setPreviewOpen] = useState(false);
  // The most recent upload not yet confirmed saved — distinct from the
  // form's persisted `imageId` so an in-progress edit can never delete an
  // already-published image, only ever its own not-yet-saved replacement.
  const [pendingUploadKey, setPendingUploadKey] = useState<string | undefined>(undefined);
  const pendingUploadKeyRef = useRef<string | undefined>(undefined);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>(undefined);

  const form = useForm<ProductCategoryFormValues>({
    resolver: zodResolver(productCategorySchema),
    defaultValues: category ? { ...EMPTY_DEFAULTS, ...category } : EMPTY_DEFAULTS,
  });

  useEffect(() => {
    const subscription = form.watch(() => setDirty(form.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [form, setDirty]);

  useBeforeUnloadWarning(form.formState.isDirty);

  useEffect(() => {
    pendingUploadKeyRef.current = pendingUploadKey;
  }, [pendingUploadKey]);

  // Cleans up an upload the user never saved (navigated away, closed the
  // tab, etc.) — registered once so it fires on unmount, reading the
  // latest key via the ref above rather than a stale closure.
  useEffect(() => {
    return () => {
      if (pendingUploadKeyRef.current) void cleanupOrphanUpload(pendingUploadKeyRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    const valid = await form.trigger();
    if (!valid) {
      toast.error(messages.states.validationTitle);
      return;
    }
    try {
      await onSubmit(form.getValues());
      setPendingUploadKey(undefined); // now persisted — no longer an orphan candidate
      setDirty(false);
    } catch (error) {
      applyApiFieldErrors(error, form.setError);
    }
  }

  const values = form.watch();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-24 md:p-6">
        <TextField control={form.control} name="name" label="Назва" />
        <TextField control={form.control} name="slug" label="Slug" description="Латиниця, цифри, дефіси" />
        <TextField control={form.control} name="description" label="Опис" textarea rows={3} />
        <div className="space-y-2">
          <TextField control={form.control} name="imageId" label="ID зображення" description="Посилання на медіатеку (заповнюється автоматично після завантаження)" />
          <div className="flex gap-2">
            <MediaUploadButton
              kind="image"
              module="categories"
              entityId={category?.id ?? "draft"}
              purpose="main"
              label="Завантажити фото"
              onUploaded={({ id, url }) => {
                const previous = pendingUploadKey;
                form.setValue("imageId", id, { shouldDirty: true });
                setImagePreviewUrl(url);
                setPendingUploadKey(id);
                if (previous) void cleanupOrphanUpload(previous);
              }}
            />
            {imagePreviewUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const previous = pendingUploadKey;
                  form.setValue("imageId", undefined, { shouldDirty: true });
                  setImagePreviewUrl(undefined);
                  setPendingUploadKey(undefined);
                  if (previous) void cleanupOrphanUpload(previous);
                }}
              >
                <X className="size-4" />
                Прибрати фото
              </Button>
            ) : null}
          </div>
          {imagePreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreviewUrl} alt="Попередній перегляд" className="h-40 w-auto rounded-md border object-cover" />
          ) : null}
        </div>
        <NumberField control={form.control} name="order" label="Порядок сортування" min={0} />
        <SwitchField control={form.control} name="active" label="Активна" description="Показувати категорію на сайті" />

        {mode === "edit" && onDelete ? (
          <Button type="button" variant="destructive" onClick={onDelete}>
            {messages.actions.delete}
          </Button>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 bottom-16 z-20 flex gap-2 border-t bg-background p-3 md:sticky md:bottom-0 md:inset-x-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setPreviewOpen(true)}>
          <Eye className="size-4" />
          {messages.actions.preview}
        </Button>
        <Button type="button" className="h-11 flex-1" disabled={submitting} onClick={handleSave}>
          {messages.actions.save}
        </Button>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={() => setPreviewOpen(false)}>
          <div className="max-h-[85svh] w-full max-w-sm overflow-y-auto rounded-t-xl bg-background p-6 md:rounded-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Попередній перегляд</h2>
            <h3 className="mt-4 text-xl font-semibold">{values.name || "Без назви"}</h3>
            <p className="mt-2 text-sm leading-relaxed">{values.description}</p>
            <Button className="mt-4 h-11 w-full" variant="outline" onClick={() => setPreviewOpen(false)}>
              Закрити
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
