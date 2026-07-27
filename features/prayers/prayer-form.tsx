"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SceneTimelineEditor } from "@/features/prayers/scene-timeline-editor";
import { SubtitleCuesEditor } from "@/features/prayers/subtitle-cues-editor";
import { PrayerPreviewSheet } from "@/features/prayers/prayer-preview-sheet";
import { NumberField } from "@/components/forms/number-field";
import { SelectField } from "@/components/forms/select-field";
import { SwitchField } from "@/components/forms/switch-field";
import { TextField } from "@/components/forms/text-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { LANGUAGE_LABELS, PARTICLE_COLOR_MODE_LABELS, PRAYER_TYPE_LABELS } from "@/lib/constants/labels";
import { messages } from "@/lib/i18n";
import { prayerSchema, type PrayerFormValues } from "@/lib/validation/prayer.schema";
import type { Prayer } from "@/types/entities";

const EMPTY_DEFAULTS: PrayerFormValues = {
  title: "",
  slug: "",
  text: "",
  language: "uk",
  prayerType: "general",
  status: "draft",
  iconId: undefined,
  calendarDayId: undefined,
  audioUrl: "",
  qrCodeUrl: "",
  imageUrl: "",
  source: "",
  sourceUrl: "",
  note: "",
  visualizerEnabled: false,
  visualizerImageUrl: "",
  particleCountDesktop: 1200,
  particleCountMobile: 400,
  particleSize: 2,
  particleColorMode: "theme",
  backgroundColor: "#0b1220",
  audioReactivity: 0.4,
  sceneTimeline: [],
  subtitleCues: [],
};

function toFormValues(prayer: Prayer): PrayerFormValues {
  return {
    ...EMPTY_DEFAULTS,
    ...prayer,
  };
}

interface PrayerFormProps {
  mode: "create" | "edit";
  prayer?: Prayer;
  onSubmit: (values: PrayerFormValues) => Promise<void>;
  onDelete?: () => void;
  submitting?: boolean;
}

export function PrayerForm({ mode, prayer, onSubmit, onDelete, submitting }: PrayerFormProps) {
  const { user } = useAuth();
  const { setDirty } = useUnsavedChanges();
  const [tab, setTab] = useState("text");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);

  const form = useForm<PrayerFormValues>({
    resolver: zodResolver(prayerSchema),
    defaultValues: prayer ? toFormValues(prayer) : EMPTY_DEFAULTS,
  });

  useEffect(() => {
    const subscription = form.watch(() => setDirty(form.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [form, setDirty]);

  useBeforeUnloadWarning(form.formState.isDirty);

  const iconsQuery = useQuery({
    queryKey: ["icons", "options"],
    queryFn: () => apiClient.icons.list({ pageSize: 200 }),
  });
  const calendarQuery = useQuery({
    queryKey: ["calendarDays", "options"],
    queryFn: () => apiClient.calendarDays.list({ pageSize: 200 }),
  });

  const iconOptions = (iconsQuery.data?.items ?? []).map((i) => ({ value: i.id, label: `${i.title} (${i.language})` }));
  const calendarOptions = (calendarQuery.data?.items ?? []).map((d) => ({ value: d.id, label: `${d.title} (${d.date})` }));

  const visualizerEnabled = form.watch("visualizerEnabled");
  const visualizerImageUrl = form.watch("visualizerImageUrl");
  const audioUrl = form.watch("audioUrl");
  const imageUrl = form.watch("imageUrl");

  async function handleSave(publish: boolean) {
    if (publish) form.setValue("status", "published", { shouldDirty: true });
    const valid = await form.trigger();
    if (!valid) {
      toast.error(messages.states.validationTitle);
      setTab("text");
      return;
    }
    await onSubmit(form.getValues());
    setDirty(false);
  }

  return (
    <div className="flex h-full flex-col">
      <form className="flex-1 space-y-4 overflow-y-auto p-4 pb-28 md:p-6 md:pb-24" onSubmit={(e) => e.preventDefault()}>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="text">Текст</TabsTrigger>
            <TabsTrigger value="relations">Зв&apos;язки</TabsTrigger>
            <TabsTrigger value="audio">Аудіо і QR</TabsTrigger>
            <TabsTrigger value="visualizer">Візуалізатор</TabsTrigger>
            <TabsTrigger value="publication">Публікація</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
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
                name="prayerType"
                label="Тип молитви"
                options={Object.entries(PRAYER_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
            <TextField control={form.control} name="text" label="Текст молитви" textarea rows={10} />
          </TabsContent>

          <TabsContent value="relations" className="space-y-4">
            <SelectField
              control={form.control}
              name="iconId"
              label="Пов'язана ікона"
              options={iconOptions}
              placeholder="Без зв'язку"
            />
            <SelectField
              control={form.control}
              name="calendarDayId"
              label="Пов'язаний календарний день"
              options={calendarOptions}
              placeholder="Без зв'язку"
            />
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <TextField control={form.control} name="audioUrl" label="Посилання на аудіо" placeholder="/mock-audio/….mp3" />
            {audioUrl ? (
              <audio controls src={audioUrl} className="w-full">
                <track kind="captions" />
              </audio>
            ) : null}
            <TextField control={form.control} name="qrCodeUrl" label="Посилання на QR-код" />
            <TextField control={form.control} name="imageUrl" label="Посилання на зображення" />
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Попередній перегляд" className="h-40 w-auto rounded-md border object-cover" />
            ) : null}
            <TextField control={form.control} name="source" label="Джерело" />
            <TextField control={form.control} name="sourceUrl" label="Посилання на джерело" />
            <TextField control={form.control} name="note" label="Примітка" textarea rows={3} />
          </TabsContent>

          <TabsContent value="visualizer" className="space-y-4">
            <SwitchField
              control={form.control}
              name="visualizerEnabled"
              label="Візуалізатор увімкнено"
              description="Показувати анімовану візуалізацію під час відтворення"
            />
            {visualizerEnabled && !visualizerImageUrl ? (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>Візуалізатор увімкнено, але зображення ще не додано</AlertTitle>
                <AlertDescription>
                  Додайте зображення для візуалізатора, інакше на сайті буде показано порожній фон.
                </AlertDescription>
              </Alert>
            ) : null}
            <TextField control={form.control} name="visualizerImageUrl" label="Зображення візуалізатора" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField control={form.control} name="particleCountDesktop" label="Кількість часток (десктоп)" min={0} max={20000} />
              <NumberField control={form.control} name="particleCountMobile" label="Кількість часток (мобільний)" min={0} max={8000} />
              <NumberField control={form.control} name="particleSize" label="Розмір частки" min={0.1} max={20} step={0.1} />
              <NumberField control={form.control} name="audioReactivity" label="Реакція на аудіо (0–1)" min={0} max={1} step={0.05} />
            </div>
            <SelectField
              control={form.control}
              name="particleColorMode"
              label="Режим кольору часток"
              options={Object.entries(PARTICLE_COLOR_MODE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <TextField control={form.control} name="backgroundColor" label="Колір фону (HEX)" placeholder="#0b1220" />

            <div className="space-y-2">
              <p className="text-sm font-medium">Субтитри</p>
              <SubtitleCuesEditor control={form.control} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Таймлайн сцени</p>
              <SceneTimelineEditor control={form.control} />
            </div>

            {user?.role === "super_admin" ? (
              <div className="space-y-2 rounded-lg border p-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => setJsonMode((v) => !v)}>
                  {jsonMode ? "Сховати" : "Показати"} розширений режим (JSON, лише для super_admin)
                </Button>
                {jsonMode ? (
                  <div className="space-y-2">
                    <p className="text-xs break-all text-muted-foreground">
                      sceneTimeline: {JSON.stringify(form.watch("sceneTimeline"))}
                    </p>
                    <p className="text-xs break-all text-muted-foreground">
                      subtitleCues: {JSON.stringify(form.watch("subtitleCues"))}
                    </p>
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
                {messages.actions.delete} молитву
              </Button>
            ) : null}
          </TabsContent>
        </Tabs>
      </form>

      <div
        className="fixed inset-x-0 bottom-16 z-20 flex gap-2 border-t bg-background p-3 md:sticky md:bottom-0 md:inset-x-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setPreviewOpen(true)}>
          <Eye className="size-4" />
          {messages.actions.preview}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-11 flex-1"
          disabled={submitting}
          onClick={() => handleSave(false)}
        >
          {messages.actions.save}
        </Button>
        <Button type="button" className="h-11 flex-1" disabled={submitting} onClick={() => handleSave(true)}>
          {messages.actions.publish}
        </Button>
      </div>

      <PrayerPreviewSheet open={previewOpen} onOpenChange={setPreviewOpen} values={form.getValues()} />
    </div>
  );
}
