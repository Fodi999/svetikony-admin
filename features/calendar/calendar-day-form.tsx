"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { TranslationSwitcher, type Completeness } from "@/components/forms/translation-switcher";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { messages } from "@/lib/i18n";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { resolveMediaPreviewUrl } from "@/lib/media/resolve-preview-url";
import { calendarDaySchema, type CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import { gospelReadingSchema } from "@/lib/validation/gospel.schema";
import { prayerSchema } from "@/lib/validation/prayer.schema";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import type { CalendarDay, CalendarEventType, GospelReading, Language, Prayer } from "@/types/entities";
import { CalendarDayActionBar } from "./calendar-day-action-bar";
import { CalendarDayAiPanel } from "./calendar-day-ai-panel";
import { CalendarDayContentStatus } from "./calendar-day-content-status";
import { CalendarDayHeader } from "./calendar-day-header";
import { CalendarDayLinksTab } from "./calendar-day-links-tab";
import { CalendarDayMediaTab } from "./calendar-day-media-tab";
import { CalendarDayPublicationTab } from "./calendar-day-publication-tab";
import { CalendarDayQuickFill } from "./calendar-day-quick-fill";
import { CalendarDaySeoTab } from "./calendar-day-seo-tab";
import {
  calendarDayCompletenessPercent,
  calendarDayMissingFieldLabels,
  calendarDayReadiness,
  validateCalendarDayLinks,
} from "./calendar-day-status";
import { CalendarDayTranslationsTab } from "./calendar-day-translations-tab";
import { gregorianToJulianCalendarDate } from "./julian-calendar";
import { prepareCalendarLanguages } from "./prepare-calendar-languages";
import { useCalendarAiActions } from "./use-calendar-ai-actions";
import { useCalendarDayPreparation } from "./use-calendar-day-preparation";

/** Matches the backend's own slugify() character class (see
 * lib/validation/common.ts's slugSchema doc comment) -- lowercase letters
 * of any script plus digits, hyphen-separated. Good enough for a quick-
 * create shortcut; the admin can still open the real record to adjust it. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{Ll}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

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
  internalNote: null,
};

const TO_READINESS_STATE: Record<Completeness, "ready" | "partial" | "missing"> = {
  done: "ready",
  partial: "partial",
  empty: "missing",
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
  /** Prefills the date field in "create" mode -- used when arriving from
   * an empty month-grid slot (task section 7: "виртуальный день" ->
   * create) or from creating a missing translation of an existing day
   * (calendar-wide metadata, not language-specific -- see
   * handleSwitchLanguage). Ignored when `day` is set. */
  initialDate?: string;
  initialEventType?: CalendarEventType;
  groupId?: string;
  initialLanguage?: Language;
  initialSlug?: string;
  onSubmit: (values: CalendarDayFormValues) => Promise<void>;
  onCreateWithAi?: (date: string, language: Language) => Promise<void>;
  preparationStatus?: string;
  onDelete?: () => void;
  submitting?: boolean;
  workingCopy?: boolean;
  onSaved?: () => Promise<unknown>;
}

export function CalendarDayForm({
  mode,
  day,
  initialDate,
  initialEventType,
  groupId,
  initialLanguage,
  initialSlug,
  onSubmit,
  onDelete,
  onCreateWithAi,
  preparationStatus,
  submitting,
  workingCopy = false,
  onSaved,
}: CalendarDayFormProps) {
  const router = useRouter();
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

  const defaultValues = day
    ? { ...EMPTY_DEFAULTS, ...day }
    : {
        ...EMPTY_DEFAULTS,
        language: initialLanguage ?? "uk",
        slug: initialSlug ?? "",
        ...(initialDate ? { date: initialDate } : {}),
        ...(initialEventType ? { eventType: initialEventType } : {}),
      };

  const form = useForm<CalendarDayFormValues>({
    resolver: zodResolver(calendarDaySchema),
    defaultValues,
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
  const [confirmPublishIncomplete, setConfirmPublishIncomplete] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState("");

  // Read-only reverse lookup for the "Зв'язки" tab: the real relation is
  // owned by the CHILD record's own calendarDayId (icons/prayers/saints/
  // gospel each carry it), not a calendar-side array -- writing a fake
  // multi-select here would silently discard whatever the admin picked
  // (see calendar-days.ts's toEntity() doc comment). To change a relation,
  // edit the child record itself.
  const iconsQuery = useQuery({ queryKey: ["icons", "options"], queryFn: () => apiClient.icons.list({ pageSize: 200 }) });
  const prayersQuery = useQuery({ queryKey: ["prayers", "options"], queryFn: () => apiClient.prayers.list({ pageSize: 200 }) });
  const saintsQuery = useQuery({ queryKey: ["saints", "options"], queryFn: () => apiClient.saints.list({ pageSize: 200 }) });
  const gospelQuery = useQuery({ queryKey: ["gospelReadings", "options"], queryFn: () => apiClient.gospelReadings.list({ pageSize: 200 }) });

  const linkedIcons = (iconsQuery.data?.items ?? []).filter((i) => i.calendarDayId === day?.id);
  const linkedPrayers = (prayersQuery.data?.items ?? []).filter((p) => p.calendarDayId === day?.id);
  const linkedSaints = (saintsQuery.data?.items ?? []).filter((s) => s.calendarDayId === day?.id);
  const linkedGospel = (gospelQuery.data?.items ?? []).filter((g) => g.calendarDayId === day?.id);

  const queryClient = useQueryClient();
  const [prayerLinkId, setPrayerLinkId] = useState("");
  const [gospelLinkId, setGospelLinkId] = useState("");
  const [linkIssues, setLinkIssues] = useState<ReturnType<typeof validateCalendarDayLinks>>([]);

  const recommendPrayerMutation = useMutation({
    mutationFn: () => apiClient.calendarDays.recommendPrayer(day!.id),
    onSuccess: (result) => {
      if (result.prayerId) {
        setPrayerLinkId(result.prayerId);
        toast.success("AI підібрав молитву -- перевірте вибір і натисніть «Зв'язати».");
      } else {
        toast.info("AI не знайшов відповідної молитви серед незв'язаних.");
      }
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });
  const linkPrayerMutation = useMutation({
    mutationFn: (prayer: Prayer) => apiClient.prayers.update(prayer.id, { ...prayer, calendarDayId: day!.id }),
    onSuccess: () => {
      toast.success("Молитву пов'язано з цим днем.");
      queryClient.invalidateQueries({ queryKey: ["prayers", "options"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });
  const unlinkPrayerMutation = useMutation({
    mutationFn: (prayer: Prayer) => apiClient.prayers.update(prayer.id, { ...prayer, calendarDayId: undefined }),
    onSuccess: () => {
      toast.success("Молитву відв'язано від цього дня.");
      queryClient.invalidateQueries({ queryKey: ["prayers", "options"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });
  const linkGospelMutation = useMutation({
    mutationFn: (reading: GospelReading) => apiClient.gospelReadings.update(reading.id, { ...reading, calendarDayId: day!.id }),
    onSuccess: () => {
      toast.success("Читання пов'язано з цим днем.");
      queryClient.invalidateQueries({ queryKey: ["gospelReadings", "options"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });
  const unlinkGospelMutation = useMutation({
    mutationFn: (reading: GospelReading) => apiClient.gospelReadings.update(reading.id, { ...reading, calendarDayId: undefined }),
    onSuccess: () => {
      toast.success("Читання відв'язано від цього дня.");
      queryClient.invalidateQueries({ queryKey: ["gospelReadings", "options"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });
  const createPrayerMutation = useMutation({
    mutationFn: (values: Parameters<typeof apiClient.prayers.create>[0]) => apiClient.prayers.create(values),
    onSuccess: () => {
      toast.success("Молитву створено й пов'язано з цим днем.");
      queryClient.invalidateQueries({ queryKey: ["prayers", "options"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });
  const createGospelMutation = useMutation({
    mutationFn: (values: Parameters<typeof apiClient.gospelReadings.create>[0]) => apiClient.gospelReadings.create(values),
    onSuccess: () => {
      toast.success("Читання створено й пов'язано з цим днем.");
      queryClient.invalidateQueries({ queryKey: ["gospelReadings", "options"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });
  const prepareGospelMutation = useMutation({
    mutationFn: () => apiClient.calendarDays.prepareGospel(day!.id),
    onSuccess: (reading) => {
      toast.success(`Створено чернетку читання: ${reading.reference}. Текст додайте вручну.`);
      queryClient.invalidateQueries({ queryKey: ["gospelReadings", "options"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  // Quick-create mini-forms are deliberately minimal (no AI authorship --
  // prayers and Gospel readings are established Church texts, not
  // freely composable content). Everything beyond these few fields
  // (audio/visualizer for prayers, etc.) stays for the admin to fill in
  // later by opening the real record; this is a shortcut, not a
  // replacement editor.
  function handleCreatePrayer(values: { title: string; text: string }) {
    if (!day) return;
    const parsed = prayerSchema.safeParse({
      title: values.title,
      slug: slugify(values.title),
      text: values.text,
      language: day.language,
      prayerType: "general",
      status: "draft",
      calendarDayId: day.id,
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
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Некоректні дані молитви");
      return;
    }
    createPrayerMutation.mutate(parsed.data);
  }

  function handleCreateGospel(values: { reference: string; title: string; text: string; explanation: string }) {
    if (!day) return;
    const parsed = gospelReadingSchema.safeParse({
      title: values.title,
      slug: slugify(values.title),
      language: day.language,
      reference: values.reference,
      text: values.text,
      explanation: values.explanation.trim() || undefined,
      status: "draft",
      calendarDayId: day.id,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Некоректні дані читання");
      return;
    }
    createGospelMutation.mutate(parsed.data);
  }

  const effectiveGroupId = day?.translationGroupId ?? groupId;

  const siblingsQuery = useQuery({
    queryKey: ["calendarDays", "group", effectiveGroupId, form.getValues("date").slice(0, 7)],
    queryFn: () => apiClient.calendarDays.list({ pageSize: 500, month: form.getValues("date").slice(0, 7) }),
    enabled: !!effectiveGroupId,
  });
  const siblings = (siblingsQuery.data?.items ?? []).filter((d) => d.translationGroupId === effectiveGroupId);

  const completeness = useMemo(() => {
    const result = {} as Record<Language, Completeness>;
    (["uk", "ru", "en"] as Language[]).forEach((lang) => {
      const sibling = siblings.find((d) => d.language === lang);
      if (!sibling) {
        result[lang] = "empty";
      } else if (sibling.title && sibling.shortDescription) {
        result[lang] = "done";
      } else {
        result[lang] = "partial";
      }
    });
    return result;
  }, [siblings]);

  const missingLanguages = (["uk", "ru", "en"] as Language[]).filter((lang) => completeness[lang] === "empty");

  const [translationsProgress, setTranslationsProgress] = useState<string | undefined>(undefined);
  const fillTranslationsMutation = useMutation({
    mutationFn: () => prepareCalendarLanguages(form.getValues("date"), form.getValues("language"), effectiveGroupId, setTranslationsProgress),
    onSuccess: () => {
      toast.success("Відсутні переклади створено як чернетки.");
      queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
    },
    onError: (error) => toast.error(errorMessageFor(error)),
    onSettled: () => setTranslationsProgress(undefined),
  });

  function handleSwitchLanguage(lang: Language) {
    if (lang === day?.language) return;
    const sibling = siblings.find((d) => d.language === lang);
    if (sibling) {
      router.push(`/calendar/${sibling.id}`);
    } else if (effectiveGroupId) {
      // Only calendar-wide metadata (date, event type, the group-linking
      // slug) is carried into the new translation -- title/description/
      // history/SEO are deliberately NOT copied, since those are
      // language-specific and must be written fresh for each translation.
      const params = new URLSearchParams({
        groupId: effectiveGroupId,
        language: lang,
        slug: form.getValues("slug"),
      });
      const date = form.getValues("date");
      if (date) params.set("date", date);
      const eventType = form.getValues("eventType");
      if (eventType) params.set("eventType", eventType);
      router.push(`/calendar/new?${params.toString()}`);
    }
  }

  async function handleSave(publish: boolean) {
    if (publish) form.setValue("status", "published", { shouldDirty: true });
    const valid = await form.trigger();
    if (!valid) {
      toast.error(messages.states.validationTitle);
      setTab("basic");
      return;
    }
    await onSubmit(form.getValues());
    pendingUploadKeyRef.current = undefined;
    setPendingUploadKey(undefined); // now persisted — no longer an orphan candidate
    setDirty(false);
    await onSaved?.();
  }

  // Publishing with empty fields is allowed (some days genuinely have no
  // SEO override, say) but should never happen by accident -- surface a
  // confirmation naming exactly what's missing instead of silently
  // publishing whatever the admin last saw. Skipped entirely once the
  // translation is actually complete, so finishing the form stays a
  // single click.
  function requestPublish() {
    if (calendarDayCompletenessPercent(form.getValues()) < 100) {
      setConfirmPublishIncomplete(true);
      return;
    }
    void handleSave(true);
  }

  const values = form.watch();
  const imagePreviewUrl = resolveMediaPreviewUrl(values.imageId);
  // Live for the translation currently open in this form (reflects
  // unsaved edits); the other two languages can only show their
  // last-fetched sibling snapshot, since their own forms aren't open here.
  const completenessPercent = useMemo(() => {
    const result = {} as Record<Language, number>;
    (["uk", "ru", "en"] as const).forEach((lang) => {
      result[lang] = lang === values.language
        ? calendarDayCompletenessPercent(values)
        : calendarDayCompletenessPercent(siblings.find((day) => day.language === lang));
    });
    return result;
  }, [siblings, values]);

  const readiness = useMemo(
    () =>
      calendarDayReadiness({
        day: { ...values, eventType: values.eventType },
        hasSaint: linkedSaints.length > 0,
        hasPrayer: linkedPrayers.length > 0,
        hasGospel: linkedGospel.length > 0,
        translations: {
          uk: TO_READINESS_STATE[completeness.uk],
          ru: TO_READINESS_STATE[completeness.ru],
          en: TO_READINESS_STATE[completeness.en],
        },
      }),
    [values, linkedSaints.length, linkedPrayers.length, linkedGospel.length, completeness],
  );

  const preparation = useCalendarDayPreparation({
    day,
    completenessPercent: calendarDayCompletenessPercent(values),
    hasPrayer: linkedPrayers.length > 0,
    hasGospel: linkedGospel.length > 0,
    prayerCandidates: prayersQuery.data?.items ?? [],
    gospelCandidates: gospelQuery.data?.items ?? [],
    saintLanguages: linkedSaints.map((s) => s.language),
    language: values.language,
    missingLanguages,
    onFillContent: () => ai.fillMissing(),
    onLinkPrayer: (prayer) => linkPrayerMutation.mutateAsync(prayer),
    onPrepareGospel: () => prepareGospelMutation.mutateAsync(),
    onFillTranslations: () => fillTranslationsMutation.mutateAsync(),
  });

  return (
    <div className="flex h-full flex-col">
      {mode === "edit" && day ? (
        <CalendarDayHeader day={day} title={values.title} date={values.date} language={values.language} readiness={readiness} />
      ) : null}

      {ai.isBusy ? <p role="status" className="px-4 pt-3 text-sm text-muted-foreground">AI готує матеріали. Дочекайтеся завершення; публікація виконується окремо.</p> : null}
      <fieldset disabled={ai.isBusy || submitting} aria-busy={ai.isBusy} className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4 pb-28 md:p-6 md:pb-24">
        {effectiveGroupId ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Переклади</p>
            <TranslationSwitcher active={values.language} onSelect={handleSwitchLanguage} completeness={completeness} />
            <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-3">
              {(["uk", "ru", "en"] as const).map((lang) => {
                const percent = completenessPercent[lang];
                return (
                  <div key={lang} className="flex min-w-0 flex-1 items-center gap-2" title={`${lang.toUpperCase()}: заповнено ${percent}%`}>
                    <span className="w-6 shrink-0 text-xs font-medium text-muted-foreground">{lang.toUpperCase()}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Заповненість перекладу ${lang.toUpperCase()}`}>
                      <div
                        className={cn("h-full rounded-full transition-[width]", percent === 100 ? "bg-emerald-500" : percent > 0 ? "bg-amber-500" : "bg-border")}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className={cn("w-9 shrink-0 text-right text-xs font-medium tabular-nums", percent === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                      {percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {mode === "create" && onCreateWithAi ? (
          <div className="space-y-2 rounded-xl border p-4">
            <Button type="button" className="w-full" disabled={submitting || !/^\d{4}-\d{2}-\d{2}$/.test(values.date) || Boolean(values.title || values.shortDescription || values.history || values.imageId || values.seoTitle || values.seoDescription)} onClick={() => void onCreateWithAi(values.date, values.language)}>
              <Sparkles className="size-4" />{preparationStatus || "Заповнити UK/RU/EN з AI · одне фото"}
            </Button>
            <p className="text-sm text-muted-foreground">Оберіть сучасну дату. Юліанська дата розраховується автоматично. AI заповнить відсутні переклади UK/RU/EN та використає одне фото. Нові записи зберігаються як чернетки за старим стилем. Перехідні свята, піст і читання потребують окремої перевірки. Публікуєте лише ви.</p>
            {Boolean(values.title || values.shortDescription || values.history || values.imageId || values.seoTitle || values.seoDescription) ? <p className="text-sm">Для введених вручну даних спочатку збережіть чернетку, потім заповніть відсутнє з AI.</p> : null}
            {preparationStatus ? <p role="status">{preparationStatus} Не закривайте сторінку.</p> : null}
          </div>
        ) : null}

        {mode === "edit" && day ? (
          <CalendarDayAiPanel
            statusRow={readiness.items.filter((item) => item.state !== "n/a")}
            plan={preparation.plan}
            analyzing={preparation.analyzing}
            executing={preparation.executing}
            onAnalyze={preparation.analyze}
            onConfirm={preparation.execute}
            onCancel={preparation.cancel}
          />
        ) : null}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="basic">Основне</TabsTrigger>
            <TabsTrigger value="content">Контент</TabsTrigger>
            <TabsTrigger value="relations">Зв&apos;язки</TabsTrigger>
            <TabsTrigger value="media">Медіа</TabsTrigger>
            <TabsTrigger value="translations">Переклади</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="publication">Публікація</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <TextField control={form.control} name="date" label="Сучасна дата (григоріанська)" type="date" />
            <p className="text-sm text-muted-foreground">Юліанська дата (старий стиль): {/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(values.date) ? gregorianToJulianCalendarDate(values.date) : "—"}</p>
            <TextField control={form.control} name="title" label="Назва" />
            <TextField control={form.control} name="slug" label="Slug" description="Латиниця, цифри, дефіси" />
            <SelectField
              control={form.control}
              name="eventType"
              label="Тип події"
              options={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />

            {mode === "edit" && day ? (
              <>
                <CalendarDayQuickFill
                  fillMissingPending={ai.isPending("fillMissing")}
                  onFillMissing={ai.fillMissing}
                  onResetChanges={() => form.reset(defaultValues)}
                />
                <CalendarDayContentStatus
                  readiness={readiness.items}
                  saint={linkedSaints[0] ? { id: linkedSaints[0].id, label: linkedSaints[0].name, hrefBase: "/saints" } : undefined}
                  prayer={linkedPrayers[0] ? { id: linkedPrayers[0].id, label: linkedPrayers[0].title, hrefBase: "/prayers" } : undefined}
                  gospel={linkedGospel[0] ? { id: linkedGospel[0].id, label: linkedGospel[0].title, hrefBase: "/gospel" } : undefined}
                  icon={linkedIcons[0] ? { id: linkedIcons[0].id, label: linkedIcons[0].title, hrefBase: "/icons" } : undefined}
                  translations={(["uk", "ru", "en"] as const).map((lang) => ({ key: lang, label: lang.toUpperCase(), state: TO_READINESS_STATE[completeness[lang]] }))}
                  onGoToTab={setTab}
                />
                <TextField control={form.control} name="internalNote" label="Примітки" textarea rows={3} description="Лише для адміністраторів. Не показується на сайті." />
              </>
            ) : null}
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
          </TabsContent>

          <TabsContent value="relations" className="space-y-4">
            {mode === "edit" && day ? (
              <CalendarDayLinksTab
                linkedIcons={linkedIcons.map((i) => ({ id: i.id, label: i.title }))}
                linkedSaints={linkedSaints.map((s) => ({ id: s.id, label: s.name }))}
                linkedPrayers={linkedPrayers.map((p) => ({ ...p, label: p.title }))}
                linkedGospel={linkedGospel.map((g) => ({ ...g, label: g.title }))}
                prayerCandidates={prayersQuery.data?.items ?? []}
                gospelCandidates={gospelQuery.data?.items ?? []}
                prayerLinkId={prayerLinkId}
                onPrayerLinkIdChange={setPrayerLinkId}
                gospelLinkId={gospelLinkId}
                onGospelLinkIdChange={setGospelLinkId}
                onLinkPrayer={(p) => linkPrayerMutation.mutate(p)}
                onUnlinkPrayer={(id) => {
                  const prayer = linkedPrayers.find((p) => p.id === id);
                  if (prayer) unlinkPrayerMutation.mutate(prayer);
                }}
                linkPrayerPending={linkPrayerMutation.isPending || unlinkPrayerMutation.isPending}
                onLinkGospel={(g) => linkGospelMutation.mutate(g)}
                onUnlinkGospel={(id) => {
                  const reading = linkedGospel.find((g) => g.id === id);
                  if (reading) unlinkGospelMutation.mutate(reading);
                }}
                linkGospelPending={linkGospelMutation.isPending || unlinkGospelMutation.isPending}
                onCreatePrayer={handleCreatePrayer}
                createPrayerPending={createPrayerMutation.isPending}
                onCreateGospel={handleCreateGospel}
                createGospelPending={createGospelMutation.isPending}
                onRecommendPrayer={() => recommendPrayerMutation.mutate()}
                recommendPrayerPending={recommendPrayerMutation.isPending}
                onPrepareGospel={() => prepareGospelMutation.mutate()}
                prepareGospelPending={prepareGospelMutation.isPending}
                linkIssues={linkIssues}
                onValidateLinks={() =>
                  setLinkIssues(
                    validateCalendarDayLinks({
                      language: values.language,
                      prayers: linkedPrayers.map((p) => ({ id: p.id, language: p.language })),
                      gospel: linkedGospel.map((g) => ({ id: g.id, language: g.language })),
                      saints: linkedSaints.map((s) => ({ id: s.id, language: s.language })),
                    }),
                  )
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Спочатку збережіть день — зв&apos;язки з&apos;являться тут після цього.</p>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <CalendarDayMediaTab
              control={form.control}
              mode={mode}
              day={day}
              imageId={values.imageId}
              imagePreviewUrl={imagePreviewUrl}
              onSelectImage={(imageId) => {
                const previous = pendingUploadKey;
                form.setValue("imageId", imageId, { shouldDirty: true });
                setPendingUploadKey(undefined);
                if (previous) void cleanupOrphanUpload(previous);
              }}
              onRemoveImage={() => {
                const previous = pendingUploadKey;
                form.setValue("imageId", undefined, { shouldDirty: true });
                setPendingUploadKey(undefined);
                if (previous) void cleanupOrphanUpload(previous);
              }}
              onUploaded={(id) => {
                // Replacing a not-yet-saved upload with another one — the
                // previous pending key is now orphaned, clean it up.
                const previous = pendingUploadKey;
                form.setValue("imageId", id, { shouldDirty: true });
                setPendingUploadKey(id);
                if (previous) void cleanupOrphanUpload(previous);
              }}
              generateImagePending={ai.isPending("generateImage") || ai.isPending("regenerateImage")}
              onGenerateImage={ai.generateImage}
              onRequestRegenerateImage={() => setConfirmRegenerateImage(true)}
              customImagePrompt={customImagePrompt}
              onCustomImagePromptChange={setCustomImagePrompt}
              generateFromPromptPending={ai.isPending("generateImageFromPrompt")}
              onGenerateFromPrompt={() => ai.generateImageFromPrompt(customImagePrompt)}
            />
          </TabsContent>

          <TabsContent value="translations" className="space-y-4">
            <CalendarDayTranslationsTab
              completenessPercent={completenessPercent}
              siblings={siblings}
              missingLanguages={missingLanguages}
              fillMissingPending={fillTranslationsMutation.isPending}
              fillMissingStatus={translationsProgress}
              onFillMissing={() => fillTranslationsMutation.mutate()}
            />
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <CalendarDaySeoTab
              control={form.control}
              mode={mode}
              hasDay={Boolean(day)}
              seoTitle={values.seoTitle}
              seoDescription={values.seoDescription}
              generatePending={ai.isPending("generateSeo") || ai.isPending("regenerateSeo")}
              onGenerate={ai.generateSeo}
              onRequestRegenerate={() => setConfirmRegenerateSeo(true)}
            />
          </TabsContent>

          <TabsContent value="publication" className="space-y-4">
            <CalendarDayPublicationTab control={form.control} mode={mode} readiness={readiness.items} onDelete={onDelete} />
          </TabsContent>
        </Tabs>
      </fieldset>

      <CalendarDayActionBar
        workingCopy={workingCopy}
        submitting={submitting}
        busy={ai.isBusy}
        onPreview={() => setPreviewOpen(true)}
        onSave={() => handleSave(false)}
        onPublish={requestPublish}
      />

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
      <ConfirmDialog
        open={confirmPublishIncomplete}
        onOpenChange={setConfirmPublishIncomplete}
        title={`Опублікувати заповнене лише на ${calendarDayCompletenessPercent(values)}%?`}
        description={`Не заповнено: ${calendarDayMissingFieldLabels(values).join(", ")}. На сайті з'явиться саме цей переклад як є.`}
        confirmLabel="Опублікувати попри це"
        onConfirm={() => {
          setConfirmPublishIncomplete(false);
          void handleSave(true);
        }}
      />
    </div>
  );
}
