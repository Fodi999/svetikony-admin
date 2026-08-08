"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Eye, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { RelationPickerField } from "@/components/forms/relation-picker-field";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api";
import { LANGUAGE_LABELS } from "@/lib/constants/labels";
import { messages } from "@/lib/i18n";
import { resolveMediaPreviewUrl } from "@/lib/media/resolve-preview-url";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { saintSchema, type SaintFormValues } from "@/lib/validation/saint.schema";
import type { Saint } from "@/types/entities";

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

const EMPTY_DEFAULTS: SaintFormValues = {
  name: "",
  slug: "",
  language: "uk",
  shortDescription: "",
  biography: "",
  feastDayOldStyle: "",
  feastDayNewStyle: "",
  imageId: undefined,
  status: "draft",
  relatedIconIds: [],
  relatedCalendarDayIds: [],
};

interface SaintFormProps {
  mode: "create" | "edit";
  saint?: Saint;
  onSubmit: (values: SaintFormValues) => Promise<void>;
  onDelete?: () => void;
  submitting?: boolean;
}

export function SaintForm({ mode, saint, onSubmit, onDelete, submitting }: SaintFormProps) {
  const { setDirty } = useUnsavedChanges();
  const [tab, setTab] = useState("main");
  const [previewOpen, setPreviewOpen] = useState(false);
  // The most recent upload not yet confirmed saved — distinct from the
  // form's persisted `imageId` so an in-progress edit can never delete an
  // already-published image, only ever its own not-yet-saved replacement.
  const [pendingUploadKey, setPendingUploadKey] = useState<string | undefined>(undefined);
  const pendingUploadKeyRef = useRef<string | undefined>(undefined);

  const form = useForm<SaintFormValues>({
    resolver: zodResolver(saintSchema),
    defaultValues: saint ? { ...EMPTY_DEFAULTS, ...saint } : EMPTY_DEFAULTS,
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

  const iconsQuery = useQuery({ queryKey: ["icons", "options"], queryFn: () => apiClient.icons.list({ pageSize: 200 }) });
  const calendarQuery = useQuery({ queryKey: ["calendarDays", "options"], queryFn: () => apiClient.calendarDays.list({ pageSize: 200 }) });
  const iconOptions = (iconsQuery.data?.items ?? []).map((i) => ({ value: i.id, label: i.title }));
  const calendarOptions = (calendarQuery.data?.items ?? []).map((d) => ({ value: d.id, label: `${d.title} (${d.date})` }));

  async function handleSave(publish: boolean) {
    if (publish) form.setValue("status", "published", { shouldDirty: true });
    const valid = await form.trigger();
    if (!valid) {
      toast.error(messages.states.validationTitle);
      setTab("main");
      return;
    }
    await onSubmit(form.getValues());
    setPendingUploadKey(undefined); // now persisted — no longer an orphan candidate
    setDirty(false);
  }

  const values = form.watch();
  const imagePreviewUrl = resolveMediaPreviewUrl(values.imageId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28 md:p-6 md:pb-24">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="main">Основне</TabsTrigger>
            <TabsTrigger value="relations">Зв&apos;язки</TabsTrigger>
            <TabsTrigger value="publication">Публікація</TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-4">
            <TextField control={form.control} name="name" label="Ім'я" />
            <TextField control={form.control} name="slug" label="Slug" description="Латиниця, цифри, дефіси" />
            <SelectField
              control={form.control}
              name="language"
              label="Мова"
              options={Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="feastDayNewStyle" label="День пам'яті (новий стиль, ММ-ДД)" placeholder="12-04" />
              <TextField control={form.control} name="feastDayOldStyle" label="День пам'яті (старий стиль, ММ-ДД)" placeholder="11-21" />
            </div>
            <TextField control={form.control} name="shortDescription" label="Короткий опис" textarea rows={3} />
            <TextField control={form.control} name="biography" label="Житіє" textarea rows={8} />
            <div className="space-y-2">
              <TextField control={form.control} name="imageId" label="ID зображення" description="Посилання на медіатеку (заповнюється автоматично після завантаження)" />
              <div className="flex gap-2">
                <MediaUploadButton
                  kind="image"
                  module="saints"
                  entityId={saint?.id ?? "draft"}
                  purpose="main"
                  label="Завантажити фото"
                  onUploaded={({ id }) => {
                    const previous = pendingUploadKey;
                    form.setValue("imageId", id, { shouldDirty: true });
                    setPendingUploadKey(id);
                    if (previous) void cleanupOrphanUpload(previous);
                  }}
                />
                {values.imageId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const previous = pendingUploadKey;
                      form.setValue("imageId", undefined, { shouldDirty: true });
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
          </TabsContent>

          <TabsContent value="relations" className="space-y-4">
            <RelationPickerField control={form.control} name="relatedIconIds" label="Пов'язані ікони" options={iconOptions} />
            <RelationPickerField control={form.control} name="relatedCalendarDayIds" label="Пов'язані календарні дні" options={calendarOptions} />
          </TabsContent>

          <TabsContent value="publication" className="space-y-4">
            <SelectField
              control={form.control}
              name="status"
              label="Статус"
              options={[
                { value: "draft", label: messages.status.draft },
                { value: "published", label: messages.status.published },
                { value: "archived", label: messages.status.archived },
              ]}
            />
            {mode === "edit" && onDelete ? (
              <Button type="button" variant="destructive" onClick={onDelete}>
                {messages.actions.delete}
              </Button>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      <div
        className="fixed inset-x-0 bottom-16 z-20 flex gap-2 border-t bg-background p-3 md:sticky md:bottom-0 md:inset-x-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setPreviewOpen(true)}>
          <Eye className="size-4" />
          {messages.actions.preview}
        </Button>
        <Button type="button" variant="secondary" className="h-11 flex-1" disabled={submitting} onClick={() => handleSave(false)}>
          {messages.actions.save}
        </Button>
        <Button type="button" className="h-11 flex-1" disabled={submitting} onClick={() => handleSave(true)}>
          {messages.actions.publish}
        </Button>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={() => setPreviewOpen(false)}>
          <div className="max-h-[85svh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-background p-6 md:rounded-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Попередній перегляд</h2>
            <h3 className="mt-4 text-2xl font-semibold">{values.name || "Без імені"}</h3>
            <p className="mt-2 text-sm leading-relaxed">{values.shortDescription || "Опис ще не додано."}</p>
            <Button className="mt-4 h-11 w-full" variant="outline" onClick={() => setPreviewOpen(false)}>
              Закрити
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
