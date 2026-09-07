"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { StateMessage } from "@/components/feedback/state-message";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { messages } from "@/lib/i18n";
import { churchInfoSchema, type ChurchInfoFormValues } from "@/lib/validation/church-info.schema";
import type { Language } from "@/types/entities";

const LANGUAGE_LABEL: Record<Language, string> = { uk: "Українська", ru: "Російська", en: "English" };

export function ChurchInfoForm() {
  const queryClient = useQueryClient();
  const { setDirty } = useUnsavedChanges();
  const [translationTab, setTranslationTab] = useState<Language>("uk");

  const query = useQuery({ queryKey: ["churchInfo"], queryFn: () => apiClient.churchInfo.get() });

  const form = useForm<ChurchInfoFormValues>({
    resolver: zodResolver(churchInfoSchema),
    values: query.data,
  });

  useEffect(() => {
    const subscription = form.watch(() => setDirty(form.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [form, setDirty]);

  useBeforeUnloadWarning(form.formState.isDirty);

  const updateMutation = useMutation({
    mutationFn: (values: ChurchInfoFormValues) => apiClient.churchInfo.update(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["churchInfo"] });
      toast.success("Інформацію про храм збережено");
      setDirty(false);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  async function handleSave() {
    const valid = await form.trigger();
    if (!valid) {
      toast.error(messages.states.validationTitle);
      return;
    }
    updateMutation.mutate(form.getValues());
  }

  if (query.isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="p-4">
        <StateMessage
          variant="error"
          title={messages.states.errorTitle}
          description={errorMessageFor(query.error)}
          action={{ label: messages.actions.retry, onClick: () => query.refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-24 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">{messages.nav.churchInfo}</h1>
          <p className="text-sm text-muted-foreground">
            Єдиний запис — інформація про храм. Публічна сторінка /churches показує цей запис лише коли статус —
            &quot;Опубліковано&quot;.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Основне</h2>
          <TextField control={form.control} name="address" label="Адреса" />
          <TextField control={form.control} name="mapsUrl" label="Посилання на карту" description="https://... — використовується для кнопки «Відкрити карту»" />
          <TextField control={form.control} name="phoneOrSite" label="Телефон або сайт" description="Один контакт: номер телефону АБО URL сайту. Клікабельним стає лише http(s) посилання." />
          <TextField control={form.control} name="priestPhone" label="Телефон священника" />
          <TextField control={form.control} name="imageUrl" label="URL зображення храму" description="Пряме посилання на зображення (не ID медіатеки)" />
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
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Переклади</h2>
            <div className="flex gap-2">
              {(["uk", "ru", "en"] as Language[]).map((lang) => (
                <Button
                  key={lang}
                  type="button"
                  variant={translationTab === lang ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTranslationTab(lang)}
                >
                  {LANGUAGE_LABEL[lang]}
                </Button>
              ))}
            </div>
          </div>
          <TextField control={form.control} name={`translations.${translationTab}.title`} label="Назва храму" />
          <TextField control={form.control} name={`translations.${translationTab}.description`} label="Опис" textarea rows={3} />
          <TextField control={form.control} name={`translations.${translationTab}.schedule`} label="Розклад богослужінь" textarea rows={3} description="Вільний текст, напр. «Нд 09:00 — Літургія, Сб 17:00 — Вечірня»" />
          <TextField control={form.control} name={`translations.${translationTab}.dedication`} label="Присвята храму" description="Напр. «на честь Покрови Пресвятої Богородиці»" />
          <TextField control={form.control} name={`translations.${translationTab}.priest`} label="Настоятель" />
          <TextField control={form.control} name={`translations.${translationTab}.shrines`} label="Святині" textarea rows={2} />
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-16 z-20 flex gap-2 border-t bg-background p-3 md:sticky md:bottom-0 md:inset-x-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <Button type="button" className="h-11 flex-1" disabled={updateMutation.isPending} onClick={handleSave}>
          {messages.actions.save}
        </Button>
      </div>
    </div>
  );
}
