"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Eye, ImageIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { RelationPickerField } from "@/components/forms/relation-picker-field";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { TranslationSwitcher, type Completeness } from "@/components/forms/translation-switcher";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { messages } from "@/lib/i18n";
import { resolveMediaPreviewUrl } from "@/lib/media/resolve-preview-url";
import { cn } from "@/lib/utils";
import { iconSchema, type IconFormValues } from "@/lib/validation/icon.schema";
import type { Icon, Language } from "@/types/entities";

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

const EMPTY_DEFAULTS: IconFormValues = {
  slug: "",
  language: "uk",
  title: "",
  description: "",
  history: "",
  saintImageDescription: "",
  materials: "",
  dimensions: "",
  mainImageId: undefined,
  galleryImageIds: [],
  relatedPrayerIds: [],
  relatedArticleIds: [],
  relatedCalendarDayIds: [],
  status: "draft",
};

interface IconFormProps {
  mode: "create" | "edit";
  icon?: Icon;
  groupId?: string;
  initialLanguage?: Language;
  initialSlug?: string;
  onSubmit: (values: IconFormValues) => Promise<void>;
  onDelete?: () => void;
  submitting?: boolean;
}

export function IconForm({ mode, icon, groupId, initialLanguage, initialSlug, onSubmit, onDelete, submitting }: IconFormProps) {
  const router = useRouter();
  const { setDirty } = useUnsavedChanges();
  const [tab, setTab] = useState("main");
  const [previewOpen, setPreviewOpen] = useState(false);
  // The most recent upload not yet confirmed saved — distinct from the
  // form's persisted `mainImageId` so an in-progress edit can never delete
  // an already-published image, only ever its own not-yet-saved replacement.
  const [pendingUploadKey, setPendingUploadKey] = useState<string | undefined>(undefined);
  const pendingUploadKeyRef = useRef<string | undefined>(undefined);
  // Gallery uploads made this session, not yet confirmed saved — same
  // orphan-cleanup-on-remove/unmount idea as pendingUploadKey above, just
  // for the multi-photo `galleryImageIds` field.
  const [pendingGalleryKeys, setPendingGalleryKeys] = useState<string[]>([]);
  const pendingGalleryKeysRef = useRef<string[]>([]);

  const form = useForm<IconFormValues>({
    resolver: zodResolver(iconSchema),
    defaultValues: icon
      ? { ...EMPTY_DEFAULTS, ...icon }
      : { ...EMPTY_DEFAULTS, language: initialLanguage ?? "uk", slug: initialSlug ?? "" },
  });

  useEffect(() => {
    const subscription = form.watch(() => setDirty(form.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [form, setDirty]);

  useBeforeUnloadWarning(form.formState.isDirty);

  useEffect(() => {
    pendingUploadKeyRef.current = pendingUploadKey;
  }, [pendingUploadKey]);

  useEffect(() => {
    pendingGalleryKeysRef.current = pendingGalleryKeys;
  }, [pendingGalleryKeys]);

  // Cleans up uploads the user never saved (navigated away, closed the
  // tab, etc.) — registered once so it fires on unmount, reading the
  // latest keys via the refs above rather than a stale closure.
  useEffect(() => {
    return () => {
      if (pendingUploadKeyRef.current) void cleanupOrphanUpload(pendingUploadKeyRef.current);
      pendingGalleryKeysRef.current.forEach((key) => void cleanupOrphanUpload(key));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveGroupId = icon?.translationGroupId ?? groupId;

  const siblingsQuery = useQuery({
    queryKey: ["icons", "group", effectiveGroupId],
    queryFn: () => apiClient.icons.list({ pageSize: 200 }),
    enabled: !!effectiveGroupId,
  });
  const siblings = (siblingsQuery.data?.items ?? []).filter((i) => i.translationGroupId === effectiveGroupId);

  const prayersQuery = useQuery({ queryKey: ["prayers", "options"], queryFn: () => apiClient.prayers.list({ pageSize: 200 }) });
  const articlesQuery = useQuery({ queryKey: ["articles", "options"], queryFn: () => apiClient.articles.list({ pageSize: 200 }) });
  const calendarQuery = useQuery({ queryKey: ["calendarDays", "options"], queryFn: () => apiClient.calendarDays.list({ pageSize: 200 }) });

  const prayerOptions = (prayersQuery.data?.items ?? []).map((p) => ({ value: p.id, label: p.title }));
  const articleOptions = (articlesQuery.data?.items ?? []).map((a) => ({ value: a.id, label: `${a.title} (${a.language})` }));
  const calendarOptions = (calendarQuery.data?.items ?? []).map((d) => ({ value: d.id, label: `${d.title} (${d.date})` }));

  const completeness = useMemo(() => {
    const result = {} as Record<Language, Completeness>;
    (["uk", "ru", "en"] as Language[]).forEach((lang) => {
      const sibling = siblings.find((s) => s.language === lang);
      if (!sibling) {
        result[lang] = "empty";
      } else if (sibling.title && sibling.description) {
        result[lang] = "done";
      } else {
        result[lang] = "partial";
      }
    });
    return result;
  }, [siblings]);

  function handleSwitchLanguage(lang: Language) {
    if (lang === icon?.language) return;
    const sibling = siblings.find((s) => s.language === lang);
    if (sibling) {
      router.push(`/icons/${sibling.id}`);
    } else if (effectiveGroupId) {
      router.push(`/icons/new?groupId=${effectiveGroupId}&language=${lang}&slug=${encodeURIComponent(form.getValues("slug"))}`);
    }
  }

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
    setPendingGalleryKeys([]);
    setDirty(false);
  }

  const values = form.watch();
  const imagePreviewUrl = resolveMediaPreviewUrl(values.mainImageId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28 md:p-6 md:pb-24">
        {effectiveGroupId ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Переклади</p>
            <TranslationSwitcher active={values.language} onSelect={handleSwitchLanguage} completeness={completeness} />
          </div>
        ) : null}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="main">Основне</TabsTrigger>
            <TabsTrigger value="media">Медіа</TabsTrigger>
            <TabsTrigger value="relations">Зв&apos;язки</TabsTrigger>
            <TabsTrigger value="publication">Публікація</TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-4">
            <TextField control={form.control} name="title" label="Назва" />
            <TextField control={form.control} name="slug" label="Slug" description="Латиниця, цифри, дефіси" />
            <TextField control={form.control} name="description" label="Опис" textarea rows={5} />
            <TextField control={form.control} name="history" label="Історія" textarea rows={5} />
            <TextField control={form.control} name="saintImageDescription" label="Опис образу святого" textarea rows={3} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="materials" label="Матеріали" />
              <TextField control={form.control} name="dimensions" label="Розміри" />
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Головне фото</p>
              <p className="text-xs text-muted-foreground">Використовується в каталозі ікон і на картці.</p>
              <TextField control={form.control} name="mainImageId" label="ID головного зображення" description="Посилання на медіатеку (заповнюється автоматично після завантаження)" />
              <div className="flex gap-2">
                <MediaUploadButton
                  kind="image"
                  module="icons"
                  entityId={icon?.id ?? "draft"}
                  purpose="main"
                  label="Завантажити фото"
                  onUploaded={({ id }) => {
                    const previous = pendingUploadKey;
                    form.setValue("mainImageId", id, { shouldDirty: true });
                    setPendingUploadKey(id);
                    if (previous) void cleanupOrphanUpload(previous);
                  }}
                />
                {values.mainImageId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const previous = pendingUploadKey;
                      form.setValue("mainImageId", undefined, { shouldDirty: true });
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

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Додаткові фото</p>
              <p className="text-xs text-muted-foreground">Галерея — показується окремо від головного фото. Можна додавати кілька та змінювати порядок.</p>
              <Controller
                control={form.control}
                name="galleryImageIds"
                render={({ field }) => {
                  const keys = field.value ?? [];

                  function removeAt(index: number) {
                    const key = keys[index];
                    field.onChange(keys.filter((_, i) => i !== index));
                    if (pendingGalleryKeysRef.current.includes(key)) {
                      void cleanupOrphanUpload(key);
                      setPendingGalleryKeys((prev) => prev.filter((item) => item !== key));
                    }
                  }

                  function move(index: number, delta: number) {
                    const target = index + delta;
                    if (target < 0 || target >= keys.length) return;
                    const next = [...keys];
                    [next[index], next[target]] = [next[target], next[index]];
                    field.onChange(next);
                  }

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <MediaUploadButton
                          kind="image"
                          module="icons"
                          entityId={icon?.id ?? "draft"}
                          purpose="main"
                          label="Додати фото"
                          onUploaded={({ id }) => {
                            field.onChange([...keys, id]);
                            setPendingGalleryKeys((prev) => [...prev, id]);
                          }}
                        />
                        <span className="text-xs text-muted-foreground">{keys.length ? `${keys.length} фото` : "Немає фото"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {keys.map((key, index) => {
                          const previewUrl = resolveMediaPreviewUrl(key);
                          return (
                            <div key={key} className={cn("relative overflow-hidden rounded-lg border bg-muted/30")}>
                              <div className="aspect-square w-full">
                                {previewUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                                    <ImageIcon className="size-6 text-muted-foreground" />
                                    <p className="line-clamp-2 break-all text-[10px] text-muted-foreground">{key}</p>
                                  </div>
                                )}
                              </div>

                              <Button
                                type="button"
                                variant="destructive"
                                size="icon-xs"
                                className="absolute right-1 top-1"
                                aria-label="Прибрати фото"
                                onClick={() => removeAt(index)}
                              >
                                <X className="size-3" />
                              </Button>

                              <div className="flex items-center justify-center gap-1 border-t bg-background/80 p-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={index === 0}
                                  aria-label="Перемістити раніше"
                                  onClick={() => move(index, -1)}
                                >
                                  <ArrowLeft className="size-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={index === keys.length - 1}
                                  aria-label="Перемістити пізніше"
                                  onClick={() => move(index, 1)}
                                >
                                  <ArrowRight className="size-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="relations" className="space-y-4">
            <RelationPickerField control={form.control} name="relatedPrayerIds" label="Пов'язані молитви" options={prayerOptions} />
            <RelationPickerField control={form.control} name="relatedArticleIds" label="Пов'язані статті" options={articleOptions} />
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
                {messages.actions.delete} ікону
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
            <h3 className="mt-4 text-2xl font-semibold">{values.title || "Без назви"}</h3>
            <p className="mt-2 text-sm leading-relaxed">{values.description || "Опис ще не додано."}</p>
            <Button className="mt-4 h-11 w-full" variant="outline" onClick={() => setPreviewOpen(false)}>
              Закрити
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
