"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Eye, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { RelationPickerField } from "@/components/forms/relation-picker-field";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api";
import { LANGUAGE_LABELS } from "@/lib/constants/labels";
import { messages } from "@/lib/i18n";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { resolveMediaPreviewUrl } from "@/lib/media/resolve-preview-url";
import { calendarDaySchema, type CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { CalendarDay } from "@/types/entities";
import { useCalendarAiActions } from "./use-calendar-ai-actions";

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
  seoTitle: null,
  seoDescription: null,
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

  // Always called (never conditionally) -- `day?.id` is only undefined in
  // "create" mode, where every AI button below stays hidden/disabled since
  // there's no saved record yet for the backend actions to operate on.
  const ai = useCalendarAiActions(day?.id, form);
  const [confirmRegenerateDescription, setConfirmRegenerateDescription] = useState(false);
  const [confirmRegenerateHistory, setConfirmRegenerateHistory] = useState(false);
  const [confirmRegenerateSeo, setConfirmRegenerateSeo] = useState(false);
  const [confirmRegenerateImage, setConfirmRegenerateImage] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState("");

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
  const imagePreviewUrl = resolveMediaPreviewUrl(values.imageId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28 md:p-6 md:pb-24">
        {mode === "edit" && day ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={ai.isPending("fillMissing")}
            onClick={ai.fillMissing}
          >
            <Sparkles className="size-4" />
            {ai.isPending("fillMissing") ? "Заповнення…" : "Заповнити відсутнє з AI"}
          </Button>
        ) : null}

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
            <div className="space-y-1">
              <TextField control={form.control} name="shortDescription" label="Короткий опис" textarea rows={3} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{values.shortDescription?.length ?? 0} символів</span>
                {mode === "edit" && day ? (
                  <div className="flex gap-2">
                    {!values.shortDescription?.trim() ? (
                      <Button type="button" size="sm" variant="ghost" disabled={ai.isPending("generateDescription")} onClick={ai.generateDescription}>
                        <Sparkles className="size-3.5" />
                        {ai.isPending("generateDescription") ? "Генерація…" : "Згенерувати"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={ai.isPending("regenerateDescription")}
                        onClick={() => setConfirmRegenerateDescription(true)}
                      >
                        <Sparkles className="size-3.5" />
                        {ai.isPending("regenerateDescription") ? "Регенерація…" : "Перегенерувати"}
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-1">
              <TextField control={form.control} name="history" label="Основний текст / житіє / опис події" textarea rows={6} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{values.history?.length ?? 0} символів</span>
                {mode === "edit" && day ? (
                  <div className="flex gap-2">
                    {!values.history?.trim() ? (
                      <Button type="button" size="sm" variant="ghost" disabled={ai.isPending("generateHistory")} onClick={ai.generateHistory}>
                        <Sparkles className="size-3.5" />
                        {ai.isPending("generateHistory") ? "Генерація…" : "Згенерувати"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={ai.isPending("regenerateHistory")}
                        onClick={() => setConfirmRegenerateHistory(true)}
                      >
                        <Sparkles className="size-3.5" />
                        {ai.isPending("regenerateHistory") ? "Регенерація…" : "Перегенерувати"}
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">SEO</p>
              <div className="space-y-1">
                <TextField control={form.control} name="seoTitle" label="SEO title" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{values.seoTitle?.length ?? 0}/70 символів</span>
                </div>
              </div>
              <div className="space-y-1">
                <TextField control={form.control} name="seoDescription" label="SEO description" textarea rows={2} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{values.seoDescription?.length ?? 0}/200 символів</span>
                  {mode === "edit" && day ? (
                    <div className="flex gap-2">
                      {!(values.seoTitle?.trim() && values.seoDescription?.trim()) ? (
                        <Button type="button" size="sm" variant="ghost" disabled={ai.isPending("generateSeo")} onClick={ai.generateSeo}>
                          <Sparkles className="size-3.5" />
                          {ai.isPending("generateSeo") ? "Генерація…" : "Згенерувати SEO"}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={ai.isPending("regenerateSeo")}
                          onClick={() => setConfirmRegenerateSeo(true)}
                        >
                          <Sparkles className="size-3.5" />
                          {ai.isPending("regenerateSeo") ? "Регенерація…" : "Перегенерувати SEO"}
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
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
              <div className="flex flex-wrap gap-2">
                <MediaUploadButton
                  kind="image"
                  module="calendar"
                  entityId={day?.id ?? "draft"}
                  purpose="main"
                  label="Завантажити фото"
                  onUploaded={({ id }) => {
                    // Replacing a not-yet-saved upload with another one —
                    // the previous pending key is now orphaned, clean it up.
                    const previous = pendingUploadKey;
                    form.setValue("imageId", id, { shouldDirty: true });
                    setPendingUploadKey(id);
                    if (previous) void cleanupOrphanUpload(previous);
                  }}
                />
                {mode === "edit" && day ? (
                  !values.imageId?.trim() ? (
                    <Button type="button" variant="outline" size="sm" disabled={ai.isPending("generateImage")} onClick={ai.generateImage}>
                      <Sparkles className="size-4" />
                      {ai.isPending("generateImage") ? "Генерація…" : "Згенерувати фото AI"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={ai.isPending("regenerateImage")}
                      onClick={() => setConfirmRegenerateImage(true)}
                    >
                      <Sparkles className="size-4" />
                      {ai.isPending("regenerateImage") ? "Регенерація…" : "Перегенерувати фото"}
                    </Button>
                  )
                ) : null}
              </div>
            </div>
            {mode === "edit" && day ? (
              <div className="space-y-2 rounded-md border p-3">
                <label className="text-sm font-medium">Промпт для AI (англійською)</label>
                <p className="text-xs text-muted-foreground">
                  Опишіть зображення власними словами англійською -- AI згенерує саме за цим описом, минаючи автоматичний пошук
                  референсу. Решта тексту дня залишається українською.
                </p>
                <Textarea
                  value={customImagePrompt}
                  onChange={(e) => setCustomImagePrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Byzantine icon of a bearded martyr saint, golden halo, warm candlelight, traditional Orthodox style"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ai.isPending("generateImageFromPrompt") || !customImagePrompt.trim()}
                  onClick={() => ai.generateImageFromPrompt(customImagePrompt)}
                >
                  <Sparkles className="size-4" />
                  {ai.isPending("generateImageFromPrompt") ? "Генерація…" : "Згенерувати за промтом"}
                </Button>
              </div>
            ) : null}
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
                    setPendingUploadKey(undefined);
                    if (previous) void cleanupOrphanUpload(previous);
                  }}
                >
                  <X className="size-4" />
                  Прибрати фото
                </Button>
                {day?.imageMetadata?.origin === "ai_generated" ? (
                  <div className="space-y-1 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Зображення:</span>{" "}
                      {day.imageMetadata.customPrompt
                        ? "AI-ілюстрація за власним промтом"
                        : day.imageMetadata.identityVerified
                          ? "AI-ілюстрація"
                          : "AI-ілюстрація · тематичний образ"}
                    </p>
                    {day.imageMetadata.customPrompt ? (
                      <p>
                        <span className="font-medium text-foreground">Промпт:</span> {day.imageMetadata.customPrompt}
                      </p>
                    ) : (
                      <p>
                        <span className="font-medium text-foreground">Референс:</span>{" "}
                        {day.imageMetadata.referenceProvider ? "Wikipedia / Wikimedia Commons" : "Референс не знайдено"}
                      </p>
                    )}
                    {day.imageMetadata.identityVerified ? (
                      <p>
                        <span className="font-medium text-foreground">Статус:</span> Особу підтверджено
                      </p>
                    ) : null}
                  </div>
                ) : null}
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

      <ConfirmDialog
        open={confirmRegenerateDescription}
        onOpenChange={setConfirmRegenerateDescription}
        title="Перегенерувати опис?"
        description="Поточний короткий опис буде замінено новою AI-версією."
        confirmLabel="Перегенерувати"
        onConfirm={() => {
          ai.regenerateDescription();
          setConfirmRegenerateDescription(false);
        }}
      />
      <ConfirmDialog
        open={confirmRegenerateHistory}
        onOpenChange={setConfirmRegenerateHistory}
        title="Перегенерувати текст?"
        description="Поточний основний текст буде замінено новою AI-версією."
        confirmLabel="Перегенерувати"
        onConfirm={() => {
          ai.regenerateHistory();
          setConfirmRegenerateHistory(false);
        }}
      />
      <ConfirmDialog
        open={confirmRegenerateSeo}
        onOpenChange={setConfirmRegenerateSeo}
        title="Перегенерувати SEO?"
        description="Поточні SEO title і description буде замінено новою AI-версією."
        confirmLabel="Перегенерувати"
        onConfirm={() => {
          ai.regenerateSeo();
          setConfirmRegenerateSeo(false);
        }}
      />
      <ConfirmDialog
        open={confirmRegenerateImage}
        onOpenChange={setConfirmRegenerateImage}
        title="Перегенерувати фото?"
        description="Поточне зображення буде замінено новим. Якщо генерація не вдасться, попереднє зображення залишиться."
        confirmLabel="Перегенерувати"
        onConfirm={() => {
          ai.regenerateImage();
          setConfirmRegenerateImage(false);
        }}
      />
    </div>
  );
}
