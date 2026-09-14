"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { TranslationSwitcher, type Completeness } from "@/components/forms/translation-switcher";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { messages } from "@/lib/i18n";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { resolveMediaPreviewUrl } from "@/lib/media/resolve-preview-url";
import { calendarDaySchema, type CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import { gospelReadingSchema } from "@/lib/validation/gospel.schema";
import { prayerSchema } from "@/lib/validation/prayer.schema";
import { cn } from "@/lib/utils";
import type { CalendarDay, CalendarEventType, GospelReading, Language, Prayer } from "@/types/entities";
import { calendarDayCompletenessPercent, calendarDayMissingFieldLabels } from "./calendar-day-status";
import { gregorianToJulianCalendarDate } from "./julian-calendar";
import { useCalendarAiActions } from "./use-calendar-ai-actions";

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

/** Read-only reverse-lookup row for the "Зв'язки" tab -- see the doc
 * comment above `linkedIcons` etc. for why this is never an editable
 * picker. */
function LinkedContentSection({ title, hrefBase, items }: { title: string; hrefBase: string; items: { id: string; label: string }[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Немає пов&apos;язаних записів.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`${hrefBase}/${item.id}`} className="text-sm text-primary underline-offset-2 hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Зв'язати існуючу" -- a small dropdown of not-yet-linked prayers/Gospel
 * readings, right in the calendar form, so linking one doesn't require
 * navigating away. Still a real write to the CHILD record's own
 * calendarDayId (via `onLink`), same as editing it directly would do --
 * this is a shortcut for the existing pattern, not a new one. Only offers
 * items with no calendarDayId at all; reassigning one already linked to a
 * *different* day stays a "go edit that record" action. */
function RelationLinkExisting<T extends { id: string; calendarDayId?: string }>({
  candidates,
  getLabel,
  onLink,
  pending,
  value,
  onValueChange,
  children,
}: {
  candidates: T[];
  getLabel: (item: T) => string;
  onLink: (item: T) => void;
  pending: boolean;
  /** Controlled so an "AI підбір" action elsewhere (see recommendPrayerMutation)
   * can pre-select a suggestion into the same dropdown -- the admin still
   * has to click "Зв'язати" themselves either way. */
  value: string;
  onValueChange: (value: string) => void;
  /** Extra controls (e.g. an "AI підбір" button) rendered alongside the
   * dropdown, sharing its layout row. */
  children?: ReactNode;
}) {
  const unlinked = candidates.filter((item) => !item.calendarDayId);
  if (!unlinked.length) return null;
  const options = unlinked.map((item) => ({ value: item.id, label: getLabel(item) }));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={(next) => onValueChange(next ?? "")} items={options}>
        <SelectTrigger className="w-full sm:w-64" aria-label="Оберіть існуючий запис">
          <SelectValue placeholder="Оберіть існуючий запис" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!value || pending}
        onClick={() => {
          const item = unlinked.find((candidate) => candidate.id === value);
          if (item) {
            onLink(item);
            onValueChange("");
          }
        }}
      >
        Зв&apos;язати
      </Button>
      {children}
    </div>
  );
}

/** "Створити нову" -- collapsed to a single button until opened, then a
 * deliberately minimal inline form (no AI authorship, no visualizer/audio
 * fields -- see handleCreatePrayer's own doc comment). */
function QuickCreatePrayer({ onCreate, pending }: { onCreate: (values: { title: string; text: string }) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Створити нову
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-md border p-3">
      <Input placeholder="Назва молитви" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Назва молитви" />
      <Textarea placeholder="Текст молитви" rows={4} value={text} onChange={(event) => setText(event.target.value)} aria-label="Текст молитви" />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            onCreate({ title, text });
            setTitle("");
            setText("");
            setOpen(false);
          }}
        >
          Створити
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Скасувати
        </Button>
      </div>
    </div>
  );
}

/** Same shape as QuickCreatePrayer, for Gospel readings (reference/title/
 * text/explanation instead of title/text). */
function QuickCreateGospel({
  onCreate,
  pending,
}: {
  onCreate: (values: { reference: string; title: string; text: string; explanation: string }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Створити нове
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-md border p-3">
      <Input placeholder="Посилання, напр. Ів. 1:1-17" value={reference} onChange={(event) => setReference(event.target.value)} aria-label="Посилання на читання" />
      <Input placeholder="Назва" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Назва читання" />
      <Textarea placeholder="Текст читання" rows={4} value={text} onChange={(event) => setText(event.target.value)} aria-label="Текст читання" />
      <Textarea placeholder="Пояснення (необов'язково)" rows={2} value={explanation} onChange={(event) => setExplanation(event.target.value)} aria-label="Пояснення" />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            onCreate({ reference, title, text, explanation });
            setReference("");
            setTitle("");
            setText("");
            setExplanation("");
            setOpen(false);
          }}
        >
          Створити
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Скасувати
        </Button>
      </div>
    </div>
  );
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

  const form = useForm<CalendarDayFormValues>({
    resolver: zodResolver(calendarDaySchema),
    defaultValues: day
      ? { ...EMPTY_DEFAULTS, ...day }
      : {
          ...EMPTY_DEFAULTS,
          language: initialLanguage ?? "uk",
          slug: initialSlug ?? "",
          ...(initialDate ? { date: initialDate } : {}),
          ...(initialEventType ? { eventType: initialEventType } : {}),
        },
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
  const linkGospelMutation = useMutation({
    mutationFn: (reading: GospelReading) => apiClient.gospelReadings.update(reading.id, { ...reading, calendarDayId: day!.id }),
    onSuccess: () => {
      toast.success("Читання пов'язано з цим днем.");
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
      // `date` in particular used to be dropped here, which made a brand
      // new "+ create translation" screen look like a broken load of an
      // existing record (blank Date/Title next to a real, carried-over
      // slug) -- see calendar-day-form's bug history.
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

  return (
    <div className="flex h-full flex-col">
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
            <p className="text-sm text-muted-foreground">Публікація перекладів окрема: {(["uk", "ru", "en"] as const).map((lang) => {
              const sibling = siblings.find((day) => day.language === lang);
              return `${lang.toUpperCase()} — ${!sibling ? "немає перекладу" : sibling.status === "published" ? "опубліковано" : sibling.status === "draft" ? "чернетка" : "не опубліковано"}`;
            }).join(" · ")}. На сайті доступні лише опубліковані версії.</p>
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
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={ai.isPending("fillMissing")}
            onClick={ai.fillMissing}
          >
            <Sparkles className="size-4" />
            {ai.isPending("fillMissing")
              ? "Заповнення…"
              : day.status === "published" && !workingCopy
                ? "Заповнити відсутнє з AI (запропонувати на розгляд)"
                : "Заповнити відсутнє з AI"}
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
            {mode === "edit" && day ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Це реальні зв&apos;язки з боку пов&apos;язаних записів (їхнє поле «календарний день»). Для ікон і святих, щоб
                  додати чи прибрати зв&apos;язок, відредагуйте відповідний запис. Молитви й читання можна зв&apos;язати або
                  швидко створити прямо тут.
                </p>
                <LinkedContentSection title="Пов'язані ікони" hrefBase="/icons" items={linkedIcons.map((i) => ({ id: i.id, label: i.title }))} />
                <div className="space-y-2">
                  <LinkedContentSection title="Пов'язані молитви" hrefBase="/prayers" items={linkedPrayers.map((p) => ({ id: p.id, label: p.title }))} />
                  <RelationLinkExisting
                    candidates={prayersQuery.data?.items ?? []}
                    getLabel={(p) => `${p.title} (${p.language.toUpperCase()})`}
                    onLink={(p) => linkPrayerMutation.mutate(p)}
                    pending={linkPrayerMutation.isPending}
                    value={prayerLinkId}
                    onValueChange={setPrayerLinkId}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={recommendPrayerMutation.isPending}
                      onClick={() => recommendPrayerMutation.mutate()}
                    >
                      <Sparkles className="size-4" />
                      {recommendPrayerMutation.isPending ? "Підбираємо…" : "AI підбір"}
                    </Button>
                  </RelationLinkExisting>
                  <QuickCreatePrayer onCreate={handleCreatePrayer} pending={createPrayerMutation.isPending} />
                </div>
                <LinkedContentSection title="Пов'язані святі" hrefBase="/saints" items={linkedSaints.map((s) => ({ id: s.id, label: s.name }))} />
                <div className="space-y-2">
                  <LinkedContentSection title="Пов'язані читання" hrefBase="/gospel" items={linkedGospel.map((g) => ({ id: g.id, label: g.title }))} />
                  <RelationLinkExisting
                    candidates={gospelQuery.data?.items ?? []}
                    getLabel={(g) => `${g.title} (${g.language.toUpperCase()})`}
                    onLink={(g) => linkGospelMutation.mutate(g)}
                    pending={linkGospelMutation.isPending}
                    value={gospelLinkId}
                    onValueChange={setGospelLinkId}
                  />
                  <QuickCreateGospel onCreate={handleCreateGospel} pending={createGospelMutation.isPending} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={prepareGospelMutation.isPending}
                    onClick={() => prepareGospelMutation.mutate()}
                  >
                    <Sparkles className="size-4" />
                    {prepareGospelMutation.isPending ? "Готуємо…" : "Підготувати з AI"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Спочатку збережіть день — зв&apos;язки з&apos;являться тут після цього.</p>
            )}
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
                  референсу. Мова тексту дня відповідає вибраному перекладу (UK/RU/EN).
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
      </fieldset>

      <div
        className="fixed inset-x-0 bottom-16 z-20 flex gap-2 border-t bg-background p-3 md:sticky md:bottom-0 md:inset-x-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setPreviewOpen(true)}>
          <Eye className="size-4" />
          {messages.actions.preview}
        </Button>
        {!workingCopy ? <Button type="button" variant="secondary" className="h-11 flex-1" disabled={submitting || ai.isBusy} onClick={() => handleSave(false)}>
          {messages.actions.save}
        </Button> : null}
        <Button type="button" className="h-11 flex-1" disabled={submitting || ai.isBusy} onClick={requestPublish}>
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
