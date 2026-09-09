"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Eye, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { NumberField } from "@/components/forms/number-field";
import { TextField } from "@/components/forms/text-field";
import { TranslationSwitcher, type Completeness } from "@/components/forms/translation-switcher";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { apiClient } from "@/lib/api";
import { messages } from "@/lib/i18n";
import { resolveMediaPreviewUrl } from "@/lib/media/resolve-preview-url";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { alphabetLetterSchema, type AlphabetLetterFormValues } from "@/lib/validation/alphabet.schema";
import type { AlphabetLetter, Language } from "@/types/entities";

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

/** audioUrl stores the resolved absolute URL (Prayers' pattern), not the
 * bare key (unlike mainImageId, which follows Saints' bare-key pattern) —
 * see lib/d1/repositories/alphabet.ts's audio_url column. Recovering the
 * key to clean up a superseded asset on save needs it extracted back out. */
function extractMediaKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const marker = "/media/";
  const index = value.indexOf(marker);
  if (index === -1) return undefined;
  return `media/${value.slice(index + marker.length)}`;
}

const EMPTY_DEFAULTS: AlphabetLetterFormValues = {
  slug: "",
  language: "uk",
  order: 0,
  letter: "",
  name: "",
  pronunciation: "",
  description: "",
  historicalNote: "",
  numericValue: undefined,
  mainImageId: undefined,
  audioUrl: "",
};

interface AlphabetLetterFormProps {
  mode: "create" | "edit";
  letter?: AlphabetLetter;
  groupId?: string;
  initialLanguage?: Language;
  initialSlug?: string;
  onSubmit: (values: AlphabetLetterFormValues) => Promise<void>;
  onDelete?: () => void;
  submitting?: boolean;
}

export function AlphabetLetterFormComponent({
  mode,
  letter,
  groupId,
  initialLanguage,
  initialSlug,
  onSubmit,
  onDelete,
  submitting,
}: AlphabetLetterFormProps) {
  const router = useRouter();
  const { setDirty } = useUnsavedChanges();
  const [previewOpen, setPreviewOpen] = useState(false);
  // Uploads made this session, not yet confirmed saved — distinct from the
  // form's persisted mainImageId/audioUrl so an in-progress edit can never
  // delete an already-published asset, only ever its own unsaved upload.
  const [pendingImageKey, setPendingImageKey] = useState<string | undefined>(undefined);
  const [pendingAudioKey, setPendingAudioKey] = useState<string | undefined>(undefined);
  const pendingKeysRef = useRef({ image: pendingImageKey, audio: pendingAudioKey });

  useEffect(() => {
    pendingKeysRef.current = { image: pendingImageKey, audio: pendingAudioKey };
  }, [pendingImageKey, pendingAudioKey]);

  // Cleans up an upload the user never saved (navigated away, closed the
  // tab, etc.) — registered once so it fires on unmount, reading the
  // latest keys via the ref above rather than a stale closure.
  useEffect(() => {
    return () => {
      if (pendingKeysRef.current.image) void cleanupOrphanUpload(pendingKeysRef.current.image);
      if (pendingKeysRef.current.audio) void cleanupOrphanUpload(pendingKeysRef.current.audio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<AlphabetLetterFormValues>({
    resolver: zodResolver(alphabetLetterSchema),
    defaultValues: letter
      ? { ...EMPTY_DEFAULTS, ...letter }
      : { ...EMPTY_DEFAULTS, language: initialLanguage ?? "uk", slug: initialSlug ?? "" },
  });

  useEffect(() => {
    const subscription = form.watch(() => setDirty(form.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [form, setDirty]);

  useBeforeUnloadWarning(form.formState.isDirty);

  const effectiveGroupId = letter?.translationGroupId ?? groupId;

  const siblingsQuery = useQuery({
    queryKey: ["alphabetLetters", "group", effectiveGroupId],
    queryFn: () => apiClient.alphabetLetters.list({ pageSize: 200 }),
    enabled: !!effectiveGroupId,
  });
  const siblings = (siblingsQuery.data?.items ?? []).filter((l) => l.translationGroupId === effectiveGroupId);

  const completeness = useMemo(() => {
    const result = {} as Record<Language, Completeness>;
    (["uk", "ru", "en"] as Language[]).forEach((lang) => {
      const sibling = siblings.find((l) => l.language === lang);
      if (!sibling) {
        result[lang] = "empty";
      } else if (sibling.name && sibling.historicalNote) {
        result[lang] = "done";
      } else {
        result[lang] = "partial";
      }
    });
    return result;
  }, [siblings]);

  function handleSwitchLanguage(lang: Language) {
    if (lang === letter?.language) return;
    const sibling = siblings.find((l) => l.language === lang);
    if (sibling) {
      router.push(`/alphabet/${sibling.id}`);
    } else if (effectiveGroupId) {
      router.push(`/alphabet/new?groupId=${effectiveGroupId}&language=${lang}&slug=${encodeURIComponent(form.getValues("slug"))}`);
    }
  }

  async function handleSave() {
    const valid = await form.trigger();
    if (!valid) {
      toast.error(messages.states.validationTitle);
      return;
    }
    const values = form.getValues();
    await onSubmit(values);
    setPendingImageKey(undefined); // now persisted — no longer an orphan candidate
    setPendingAudioKey(undefined);

    // The previously-persisted audio asset (if any) is now superseded —
    // clean it up only after the save actually succeeded, so a cancelled
    // edit can never orphan-delete a still-published file. mainImageId
    // already follows Saints' simpler not-yet-saved-only cleanup (no diff
    // against the previous value needed there).
    if (letter) {
      const oldAudioKey = extractMediaKey(letter.audioUrl);
      if (oldAudioKey && oldAudioKey !== extractMediaKey(values.audioUrl)) void cleanupOrphanUpload(oldAudioKey);
    }

    setDirty(false);
  }

  const values = form.watch();
  const imagePreviewUrl = resolveMediaPreviewUrl(values.mainImageId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-24 md:p-6">
        {effectiveGroupId ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Переклади</p>
            <TranslationSwitcher active={values.language} onSelect={handleSwitchLanguage} completeness={completeness} />
          </div>
        ) : null}

        {letter ? (
          <Field>
            <FieldLabel>Translation Group ID</FieldLabel>
            <p className="rounded-md border bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">{letter.translationGroupId}</p>
            <FieldDescription>Лише для перегляду — керується автоматично.</FieldDescription>
          </Field>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
          <TextField control={form.control} name="letter" label="Гліф" description="Напр.: Б" />
          <TextField control={form.control} name="name" label="Назва букви" />
        </div>
        <TextField control={form.control} name="slug" label="Slug" description="Латиниця, цифри, дефіси" />
        <NumberField control={form.control} name="numericValue" label="Числове значення" min={0} max={999} />
        <TextField control={form.control} name="pronunciation" label="Вимова" />
        <TextField control={form.control} name="description" label="Опис" textarea rows={3} />
        <TextField control={form.control} name="historicalNote" label="Історична довідка" textarea rows={4} />

        <div className="space-y-2">
          <FieldLabel>Фото букви</FieldLabel>
          <div className="flex gap-2">
            <MediaUploadButton
              kind="image"
              module="alphabet"
              entityId={letter?.id ?? "draft"}
              purpose="main"
              label="Завантажити фото"
              onUploaded={({ id }) => {
                const previous = pendingImageKey;
                form.setValue("mainImageId", id, { shouldDirty: true });
                setPendingImageKey(id);
                if (previous) void cleanupOrphanUpload(previous);
              }}
            />
            {values.mainImageId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const previous = pendingImageKey;
                  form.setValue("mainImageId", undefined, { shouldDirty: true });
                  setPendingImageKey(undefined);
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

        <div className="space-y-2">
          <FieldLabel>Аудіо (озвучення історичної довідки)</FieldLabel>
          <FieldDescription>Запис має озвучувати текст поля «Історична довідка» цією мовою.</FieldDescription>
          <div className="flex gap-2">
            <MediaUploadButton
              kind="audio"
              module="alphabet"
              entityId={letter?.id ?? "draft"}
              purpose="audio"
              label="Завантажити аудіо"
              onUploaded={({ id, url }) => {
                const previous = pendingAudioKey;
                form.setValue("audioUrl", url, { shouldDirty: true });
                setPendingAudioKey(id);
                if (previous) void cleanupOrphanUpload(previous);
              }}
            />
            {values.audioUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const previous = pendingAudioKey;
                  form.setValue("audioUrl", "", { shouldDirty: true });
                  setPendingAudioKey(undefined);
                  if (previous) void cleanupOrphanUpload(previous);
                }}
              >
                <X className="size-4" />
                Видалити аудіо
              </Button>
            ) : null}
          </div>
          {values.audioUrl ? (
            <audio controls src={values.audioUrl} className="w-full">
              <track kind="captions" />
            </audio>
          ) : null}
        </div>

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
          <div className="max-h-[85svh] w-full max-w-sm overflow-y-auto rounded-t-xl bg-background p-6 text-center md:rounded-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Попередній перегляд</h2>
            <p className="mt-4 text-4xl font-semibold">{values.name || "?"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{values.pronunciation}</p>
            <p className="mt-3 text-sm leading-relaxed">{values.description}</p>
            <Button className="mt-4 h-11 w-full" variant="outline" onClick={() => setPreviewOpen(false)}>
              Закрити
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
