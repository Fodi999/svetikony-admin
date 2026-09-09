"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ModelViewerPreview } from "@/components/forms/model-viewer-preview";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { NumberField } from "@/components/forms/number-field";
import { SelectField } from "@/components/forms/select-field";
import { SwitchField } from "@/components/forms/switch-field";
import { TextField } from "@/components/forms/text-field";
import { TranslationSwitcher, type Completeness } from "@/components/forms/translation-switcher";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import {
  VISUALIZER_CALENDAR_ERA_LABELS,
  VISUALIZER_CHRONOLOGY_TYPE_LABELS,
  VISUALIZER_ERA_LABELS,
  VISUALIZER_EVENT_TYPE_LABELS,
} from "@/lib/constants/visualizer-labels";
import { messages } from "@/lib/i18n";
import { resolveMediaPreviewUrl } from "@/lib/media/resolve-preview-url";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { visualizerEventSchema, type VisualizerEventFormValues } from "@/lib/validation/visualizer-event.schema";
import type { Language, VisualizerEvent } from "@/types/entities";

const EMPTY_DEFAULTS: VisualizerEventFormValues = {
  slug: "",
  language: "uk",
  title: "",
  summary: "",
  description: "",
  eventType: "other",
  chronologyType: "unknown",
  era: "custom",
  calendarEra: "unknown",
  yearStart: undefined,
  yearEnd: undefined,
  century: undefined,
  displayDate: "",
  locationName: "",
  latitude: undefined,
  longitude: undefined,
  status: "draft",
  isFeatured: false,
};

interface VisualizerEventFormProps {
  mode: "create" | "edit";
  event?: VisualizerEvent;
  groupId?: string;
  initialLanguage?: Language;
  initialSlug?: string;
  onSubmit: (values: VisualizerEventFormValues) => Promise<void>;
  onDelete?: () => void;
  submitting?: boolean;
}

export function VisualizerEventForm({
  mode,
  event,
  groupId,
  initialLanguage,
  initialSlug,
  onSubmit,
  onDelete,
  submitting,
}: VisualizerEventFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setDirty } = useUnsavedChanges();
  const [tab, setTab] = useState("main");
  const [previewOpen, setPreviewOpen] = useState(false);

  const form = useForm<VisualizerEventFormValues>({
    resolver: zodResolver(visualizerEventSchema),
    defaultValues: event
      ? { ...EMPTY_DEFAULTS, ...event }
      : { ...EMPTY_DEFAULTS, language: initialLanguage ?? "uk", slug: initialSlug ?? "" },
  });

  useEffect(() => {
    const subscription = form.watch(() => setDirty(form.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [form, setDirty]);

  useBeforeUnloadWarning(form.formState.isDirty);

  const effectiveGroupId = event?.translationGroupId ?? groupId;

  const siblingsQuery = useQuery({
    queryKey: ["visualizerEvents", "group", effectiveGroupId],
    queryFn: () => apiClient.visualizerEvents.list({ pageSize: 200 }),
    enabled: !!effectiveGroupId,
  });
  const siblings = (siblingsQuery.data?.items ?? []).filter((e) => e.translationGroupId === effectiveGroupId);

  const completeness = useMemo(() => {
    const result = {} as Record<Language, Completeness>;
    (["uk", "ru", "en"] as Language[]).forEach((lang) => {
      const sibling = siblings.find((e) => e.language === lang);
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
    if (lang === event?.language) return;
    const sibling = siblings.find((e) => e.language === lang);
    if (sibling) {
      router.push(`/visualizer/${sibling.id}`);
    } else if (effectiveGroupId) {
      router.push(`/visualizer/new?groupId=${effectiveGroupId}&language=${lang}&slug=${encodeURIComponent(form.getValues("slug"))}`);
    }
  }

  // GLB models attach to the event's translation GROUP (shared across its
  // uk/ru/en rows), not one language row — the backend also rejects a
  // model whose eventGroupId doesn't match a real existing group, so
  // uploading is only possible once the event has been saved at least once.
  const modelsQuery = useQuery({
    queryKey: ["visualizerModels", "group", effectiveGroupId],
    queryFn: () => apiClient.visualizerModels.list({ eventGroupId: effectiveGroupId }),
    enabled: !!effectiveGroupId,
  });

  const removeModelMutation = useMutation({
    mutationFn: (id: string) => apiClient.visualizerModels.remove(id),
    onSuccess: () => {
      toast.success("3D-модель видалено");
      queryClient.invalidateQueries({ queryKey: ["visualizerModels", "group", effectiveGroupId] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const createModelMutation = useMutation({
    mutationFn: (input: { r2Key: string; filename?: string; mimeType?: string; fileSize?: number }) =>
      apiClient.visualizerModels.create({ eventGroupId: effectiveGroupId, ...input }),
    onSuccess: () => {
      toast.success("3D-модель додано");
      queryClient.invalidateQueries({ queryKey: ["visualizerModels", "group", effectiveGroupId] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  async function handleSave(publish: boolean) {
    if (publish) form.setValue("status", "published", { shouldDirty: true });
    const valid = await form.trigger();
    if (!valid) {
      toast.error(messages.states.validationTitle);
      setTab("main");
      return;
    }
    await onSubmit(form.getValues());
    setDirty(false);
  }

  const values = form.watch();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28 md:p-6 md:pb-24">
        {effectiveGroupId ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Переклади</p>
            <TranslationSwitcher active={values.language} onSelect={handleSwitchLanguage} completeness={completeness} />
          </div>
        ) : null}

        {event ? (
          <Field>
            <FieldLabel>Translation Group ID</FieldLabel>
            <p className="rounded-md border bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">{event.translationGroupId}</p>
            <FieldDescription>Лише для перегляду — керується автоматично.</FieldDescription>
          </Field>
        ) : null}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="main">Основне</TabsTrigger>
            <TabsTrigger value="chronology">Хронологія</TabsTrigger>
            <TabsTrigger value="geo">Географія</TabsTrigger>
            <TabsTrigger value="model">3D-модель</TabsTrigger>
            <TabsTrigger value="publication">Публікація</TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-4">
            <TextField control={form.control} name="title" label="Назва події" />
            <TextField control={form.control} name="slug" label="Slug" description="Латиниця, цифри, дефіси" />
            <SelectField
              control={form.control}
              name="eventType"
              label="Тип події"
              options={Object.entries(VISUALIZER_EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <TextField control={form.control} name="summary" label="Короткий опис" textarea rows={3} />
            <TextField control={form.control} name="description" label="Повний опис" textarea rows={8} />
            <SwitchField control={form.control} name="isFeatured" label="Рекомендована подія" />
          </TabsContent>

          <TabsContent value="chronology" className="space-y-4">
            <FieldDescription>
              Не вказуйте точний рік там, де датування історично невстановлене — оберіть відповідний тип хронології
              та за потреби заповніть «Текст дати» текстом на кшталт «Традиційна біблійна хронологія».
            </FieldDescription>
            <SelectField
              control={form.control}
              name="chronologyType"
              label="Тип хронології"
              options={Object.entries(VISUALIZER_CHRONOLOGY_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <SelectField
              control={form.control}
              name="era"
              label="Епоха"
              options={Object.entries(VISUALIZER_ERA_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <SelectField
              control={form.control}
              name="calendarEra"
              label="Літочислення"
              options={Object.entries(VISUALIZER_CALENDAR_ERA_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberField control={form.control} name="yearStart" label="Рік (початок)" />
              <NumberField control={form.control} name="yearEnd" label="Рік (кінець)" />
              <NumberField control={form.control} name="century" label="Століття" />
            </div>
            <TextField
              control={form.control}
              name="displayDate"
              label="Текст дати"
              description="Показується відвідувачам замість/поряд з роком, напр. «Традиційна біблійна хронологія»"
            />
          </TabsContent>

          <TabsContent value="geo" className="space-y-4">
            <TextField control={form.control} name="locationName" label="Назва місця" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField control={form.control} name="latitude" label="Широта" min={-90} max={90} step={0.0001} />
              <NumberField control={form.control} name="longitude" label="Довгота" min={-180} max={180} step={0.0001} />
            </div>
            <FieldDescription>
              Якщо координати вказано, публічний 3D-візуалізатор автоматично направить Землю на цю точку.
            </FieldDescription>
          </TabsContent>

          <TabsContent value="model" className="space-y-4">
            {!effectiveGroupId ? (
              <FieldDescription>Спочатку збережіть подію — після цього можна буде додати 3D-модель.</FieldDescription>
            ) : (
              <>
                <MediaUploadButton
                  kind="model"
                  module="visualizer"
                  entityId={effectiveGroupId}
                  purpose="model"
                  onUploaded={({ id }) => {
                    void createModelMutation.mutateAsync({ r2Key: id });
                  }}
                />
                <div className="space-y-4">
                  {(modelsQuery.data ?? []).map((model) => {
                    const previewUrl = resolveMediaPreviewUrl(model.r2Key);
                    return (
                      <div key={model.id} className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{model.filename || model.r2Key}</p>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeModelMutation.mutate(model.id)}>
                            <Trash2 className="size-4" />
                            Видалити
                          </Button>
                        </div>
                        {previewUrl ? <ModelViewerPreview src={previewUrl} alt={model.filename} /> : null}
                      </div>
                    );
                  })}
                  {modelsQuery.data?.length === 0 ? <p className="text-sm text-muted-foreground">3D-модель ще не додано.</p> : null}
                </div>
              </>
            )}
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
            <h3 className="mt-4 text-2xl font-semibold">{values.title || "Без назви"}</h3>
            <p className="mt-2 text-sm leading-relaxed">{values.summary || "Опис ще не додано."}</p>
            <Button className="mt-4 h-11 w-full" variant="outline" onClick={() => setPreviewOpen(false)}>
              Закрити
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
