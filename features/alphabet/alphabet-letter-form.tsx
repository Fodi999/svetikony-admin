"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { NumberField } from "@/components/forms/number-field";
import { TextField } from "@/components/forms/text-field";
import { TranslationSwitcher, type Completeness } from "@/components/forms/translation-switcher";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { apiClient } from "@/lib/api";
import { messages } from "@/lib/i18n";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { alphabetLetterSchema, type AlphabetLetterFormValues } from "@/lib/validation/alphabet.schema";
import type { AlphabetLetter, Language } from "@/types/entities";

const EMPTY_DEFAULTS: AlphabetLetterFormValues = {
  slug: "",
  language: "uk",
  order: 0,
  name: "",
  pronunciation: "",
  description: "",
  historicalNote: "",
  numericValue: undefined,
  mainImageId: undefined,
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
    await onSubmit(form.getValues());
    setDirty(false);
  }

  const values = form.watch();

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

        <TextField control={form.control} name="name" label="Назва букви" />
        <TextField control={form.control} name="slug" label="Slug" description="Латиниця, цифри, дефіси" />
        <NumberField control={form.control} name="numericValue" label="Числове значення" min={0} max={999} />
        <TextField control={form.control} name="pronunciation" label="Вимова" />
        <TextField control={form.control} name="description" label="Опис" textarea rows={3} />
        <TextField control={form.control} name="historicalNote" label="Історична довідка" textarea rows={4} />
        <TextField control={form.control} name="mainImageId" label="ID зображення" description="Stage 1: ID з медіатеки" />

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
