"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { VisualizerModelsPanel } from "./visualizer-models-panel";
import { useAuth } from "@/lib/auth/auth-context";
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
import {
  VISUALIZER_CALENDAR_ERA_LABELS,
  VISUALIZER_CHRONOLOGY_TYPE_LABELS,
  VISUALIZER_ERA_LABELS,
  VISUALIZER_EVENT_TYPE_LABELS,
} from "@/lib/constants/visualizer-labels";
import { messages } from "@/lib/i18n";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import {
  visualizerEventSchema,
  type VisualizerEventFormValues,
} from "@/lib/validation/visualizer-event.schema";
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
  const { canEdit } = useAuth();
  const editable = canEdit("content");
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

  const calendarQuery = useQuery({
    queryKey: ["calendarDays", "visualizer-picker"],
    queryFn: () => apiClient.calendarDays.list({ pageSize: 1000 }),
  });
  const siblingsQuery = useQuery({
    queryKey: ["visualizerEvents", "group", effectiveGroupId],
    queryFn: () => apiClient.visualizerEvents.list({ pageSize: 200 }),
    enabled: !!effectiveGroupId,
  });
  const siblings = (siblingsQuery.data?.items ?? []).filter(
    (e) => e.translationGroupId === effectiveGroupId,
  );

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
      router.push(
        `/visualizer/new?groupId=${effectiveGroupId}&language=${lang}&slug=${encodeURIComponent(form.getValues("slug"))}`,
      );
    }
  }

  async function handleSave(publish: boolean) {
    if (!editable) return;
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
            <p className="text-muted-foreground text-xs font-medium">Переклади</p>
            <TranslationSwitcher
              active={values.language}
              onSelect={handleSwitchLanguage}
              completeness={completeness}
            />
          </div>
        ) : null}

        {event ? (
          <Field>
            <FieldLabel>Translation Group ID</FieldLabel>
            <p className="bg-muted text-muted-foreground rounded-md border px-3 py-2 font-mono text-xs">
              {event.translationGroupId}
            </p>
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
            <TextField
              control={form.control}
              name="slug"
              label="Slug"
              description="Латиниця, цифри, дефіси"
            />
            <SelectField
              control={form.control}
              name="eventType"
              label="Тип події"
              options={Object.entries(VISUALIZER_EVENT_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <TextField
              control={form.control}
              name="summary"
              label="Короткий опис"
              textarea
              rows={3}
            />
            <TextField
              control={form.control}
              name="description"
              label="Повний опис"
              textarea
              rows={8}
            />
            <SwitchField control={form.control} name="isFeatured" label="Рекомендована подія" />
          </TabsContent>

          <TabsContent value="chronology" className="space-y-4">
            <FieldDescription>
              Не вказуйте точний рік там, де датування історично невстановлене — оберіть відповідний
              тип хронології та за потреби заповніть «Текст дати» текстом на кшталт «Традиційна
              біблійна хронологія».
            </FieldDescription>
            <SelectField
              control={form.control}
              name="chronologyType"
              label="Тип хронології"
              options={Object.entries(VISUALIZER_CHRONOLOGY_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <SelectField
              control={form.control}
              name="era"
              label="Епоха"
              options={Object.entries(VISUALIZER_ERA_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <SelectField
              control={form.control}
              name="calendarEra"
              label="Літочислення"
              options={Object.entries(VISUALIZER_CALENDAR_ERA_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberField control={form.control} name="yearStart" label="Рік (початок)" />
              <NumberField control={form.control} name="yearEnd" label="Рік (кінець)" />
              <NumberField control={form.control} name="century" label="Століття" />
            </div>
            <NumberField
              control={form.control}
              name="sortYear"
              label="Порядок у хронології"
              description="Необов’язковий ключ сортування. Від’ємні числа — до н. е. Залиште порожнім для автоматичного порядку; відвідувачі цього числа не бачать."
            />
            <TextField
              control={form.control}
              name="displayDate"
              label="Текст дати"
              description="Показується відвідувачам замість/поряд з роком, напр. «Традиційна біблійна хронологія»"
            />
          </TabsContent>

          <TabsContent value="geo" className="space-y-4">
            <SelectField
              control={form.control}
              name="calendarDayId"
              label="Подія церковного календаря"
              options={[
                { value: "", label: "Без зв’язку з календарем" },
                ...(calendarQuery.data?.items ?? []).map((day) => ({
                  value: day.id,
                  label: day.title,
                })),
              ]}
            />
            <TextField control={form.control} name="locationName" label="Назва місця" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField
                control={form.control}
                name="latitude"
                label="Широта"
                min={-90}
                max={90}
                step={0.0001}
              />
              <NumberField
                control={form.control}
                name="longitude"
                label="Довгота"
                min={-180}
                max={180}
                step={0.0001}
              />
            </div>
            <FieldDescription>
              Якщо координати вказано, публічний 3D-візуалізатор автоматично направить Землю на цю
              точку.
            </FieldDescription>
          </TabsContent>

          <TabsContent value="model" className="space-y-4">
            {effectiveGroupId ? (
              <VisualizerModelsPanel
                mode="event"
                eventGroupId={effectiveGroupId}
                editable={editable}
              />
            ) : (
              <FieldDescription>Спочатку збережіть подію, щоб додати 3D-модель.</FieldDescription>
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
            {editable && mode === "edit" && onDelete ? (
              <Button type="button" variant="destructive" onClick={onDelete}>
                {messages.actions.delete}
              </Button>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      <div
        className="bg-background fixed inset-x-0 bottom-16 z-20 flex gap-2 border-t p-3 md:sticky md:inset-x-auto md:bottom-0"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="size-4" />
          {messages.actions.preview}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-11 flex-1"
          disabled={submitting || !editable}
          onClick={() => handleSave(false)}
        >
          {messages.actions.save}
        </Button>
        <Button
          type="button"
          className="h-11 flex-1"
          disabled={submitting || !editable}
          onClick={() => handleSave(true)}
        >
          {messages.actions.publish}
        </Button>
      </div>

      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-background max-h-[85svh] w-full max-w-lg overflow-y-auto rounded-t-xl p-6 md:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Попередній перегляд</h2>
            <h3 className="mt-4 text-2xl font-semibold">{values.title || "Без назви"}</h3>
            <p className="mt-2 text-sm leading-relaxed">{values.summary || "Опис ще не додано."}</p>
            <p>
              {values.displayDate || [values.yearStart, values.yearEnd].filter(Boolean).join("–")} ·{" "}
              {values.locationName}
            </p>
            <p className="text-muted-foreground text-sm">
              {VISUALIZER_CHRONOLOGY_TYPE_LABELS[values.chronologyType]}
            </p>
            <p className="whitespace-pre-wrap">{values.description}</p>
            {effectiveGroupId ? (
              <VisualizerModelsPanel
                mode="event"
                eventGroupId={effectiveGroupId}
                editable={false}
              />
            ) : null}
            <Button
              className="mt-4 h-11 w-full"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              Закрити
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
