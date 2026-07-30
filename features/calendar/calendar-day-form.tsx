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
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { calendarDaySchema, type CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { CalendarDay } from "@/types/entities";

const EVENT_TYPE_LABELS = {
  feast: "Свято",
  fast: "Піст",
  memorial: "Памятна дата",
  liturgical: "Богослужбовий",
  civil: "Цивільний",
};

const EMPTY_DEFAULTS: CalendarDayFormValues = {
  date: "",
  title: "",
  slug: "",
  language: "uk",
  shortDescription: "",
  history: "",
  eventType: "feast",
  status: "draft",
  imageId: undefined,
  relatedIconIds: [],
  relatedPrayerIds: [],
  relatedSaintIds: [],
  relatedGospelIds: [],
};

/**
 * Best-effort orphan cleanup for a not-yet-saved upload. No-op in mock
 * mode (nothing real to clean up) — same real-mode detection
 * MediaUploadButton uses. A failure here must never block the user.
 */
async function cleanupOrphanUpload(key: string) {
  if (!apiClient.media.uploadObject) return;
  try {
    await apiClient.media.remove(key);
  } catch {
    // Best-effort; nothing to do if it fails.
  }
}

interface CalendarDayFormProps {
  mode: "create" | "edit";
  day?: CalendarDay;
  onSubmit: (values: CalendarDayFormValues) => Promise<void>;
  onDelete?: () => void;
  submitting?: boolean;
}

export function CalendarDayForm({ mode, day, onSubmit, onDelete, submitting }: CalendarDayFormProps) {
  const { setDirty } = useUnsavedChanges();
  const [tab, setTab] = useState("basic");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>(undefined);
  // The most recent upload not yet confirmed saved — distinct from the
  // form's persisted `imageId` so an in-progress edit can never delete an
  // already-published image, only ever its own not-yet-saved replacement.
  const [pendingUploadKey, setPendingUploadKey] = useState<string | undefined>(undefined);
  const pendingUploadKeyRef = useRef<string | undefined>(undefined);

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

  const form = useForm<CalendarDayFormValues>({
    resolver: zodResolver(calendarDaySchema),
    defaultValues: day ? { ...EMPTY_DEFAULTS, ...day } : EMPTY_DEFAULTS,
  });

  useEffect(() => {
    const subscription = form.watch(() => setDirty(form.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [form, setDirty]);

  useBeforeUnloadWarning(form.formState.isDirty);

  const iconsQuery = useQuery({ queryKey: ["icons", "options"], queryFn: () => apiClient.icons.list({ pageSize: 200 }) });
  const prayersQuery = useQuery({ queryKey: ["prayers", "options"], queryFn: () => apiClient.prayers.list({ pageSize: 200 }) });
  const saintsQuery = useQuery({ queryKey: ["saints", "options"], queryFn: () => apiClient.saints.list({ pageSize: 200 }) });
  const gospelQuery = useQuery({ queryKey: ["gospelReadings", "options"], queryFn: () => apiClient.gospelReadings.list({ pageSize: 200 }) });

  const iconOptions = (iconsQuery.data?.items ?? []).map((i) => ({ value: i.id, label: i.title }));
  const prayerOptions = (prayersQuery.data?.items ?? []).map((p) => ({ value: p.id, label: p.title }));
  const saintOptions = (saintsQuery.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
  const gospelOptions = (gospelQuery.data?.items ?? []).map((g) => ({ value: g.id, label: g.title }));

  async function handleSave(publish: boolean) {
    if (publish) form.setValue("status", "published", { shouldDirty: true });
    const valid = await form.trigger();
    if (!valid) {
      toast.error(messages.states.validationTitle);
      setTab("basic");
      return;
    }
    await onSubmit(form.getValues());
    setPendingUploadKey(undefined); // now persisted — no longer an orphan candidate
    setDirty(false);
  }

  const values = form.watch();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28 md:p-6 md:pb-24">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="basic">Основне</TabsTrigger>
            <TabsTrigger value="content">Контент</TabsTrigger>
            <TabsTrigger value="relations">Зв&apos;язки</TabsTrigger>
            <TabsTrigger value="media">Медіа</TabsTrigger>
            <TabsTrigger value="publication">Публікація</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <TextField control={form.control} name="date" label="Дата" type="date" />
            <TextField control={form.control} name="title" label="Назва" />
            <TextField control={form.control} name="slug" label="Slug" description="Латиниця, цифри, дефіси" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                control={form.control}
                name="language"
                label="Мова"
                options={Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <SelectField
                control={form.control}
                name="eventType"
                label="Тип події"
                options={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <TextField control={form.control} name="shortDescription" label="Короткий опис" textarea rows={3} />
            <TextField control={form.control} name="history" label="Історична довідка" textarea rows={6} />
          </TabsContent>

          <TabsContent value="relations" className="space-y-4">
            <RelationPickerField control={form.control} name="relatedIconIds" label="Пов'язані ікони" options={iconOptions} />
            <RelationPickerField control={form.control} name="relatedPrayerIds" label="Пов'язані молитви" options={prayerOptions} />
            <RelationPickerField control={form.control} name="relatedSaintIds" label="Пов'язані святі" options={saintOptions} />
            <RelationPickerField control={form.control} name="relatedGospelIds" label="Пов'язані читання" options={gospelOptions} />
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <div className="space-y-2">
              <TextField control={form.control} name="imageId" label="ID зображення" description="Фото для картки календаря. Посилання на медіатеку (Stage 1: введіть ID вручну)" />
              <MediaUploadButton
                kind="image"
                module="calendar"
                entityId={day?.id ?? "draft"}
                purpose="main"
                label="Завантажити фото"
                onUploaded={({ id, url }) => {
                  // Replacing a not-yet-saved upload with another one —
                  // the previous pending key is now orphaned, clean it up.
                  const previous = pendingUploadKey;
                  form.setValue("imageId", id, { shouldDirty: true });
                  setImagePreviewUrl(url);
                  setPendingUploadKey(id);
                  if (previous) void cleanupOrphanUpload(previous);
                }}
              />
            </div>
            {imagePreviewUrl ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreviewUrl} alt="Попередній перегляд" className="h-40 w-auto rounded-md border object-cover" />
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
              </div>
            ) : null}
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
                {messages.actions.delete} день
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
          <div
            className="max-h-[85svh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-background p-6 md:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Попередній перегляд</h2>
            <p className="mt-1 text-sm text-muted-foreground">{values.date}</p>
            <h3 className="mt-4 text-2xl font-semibold">{values.title || "Без назви"}</h3>
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
