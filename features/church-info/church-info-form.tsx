"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/text-field";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { StateMessage } from "@/components/feedback/state-message";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { messages } from "@/lib/i18n";
import { churchInfoSchema, type ChurchInfoFormValues } from "@/lib/validation/church-info.schema";
import type { Language } from "@/types/entities";

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.round(Math.random() * 1000)}`;
}

const LANGUAGE_LABEL: Record<Language, string> = { uk: "Українська", ru: "Російська", en: "English" };

export function ChurchInfoForm() {
  const queryClient = useQueryClient();
  const { setDirty } = useUnsavedChanges();
  const [tab, setTab] = useState("main");
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
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-24 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">{messages.nav.churchInfo}</h1>
          <p className="text-sm text-muted-foreground">Єдиний запис — інформація про храм.</p>
        </div>

        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Це форма повного заміщення запису (full-replace)</AlertTitle>
          <AlertDescription>
            На етапі 2 перед збереженням спочатку буде завантажено поточний запис повністю, щоб випадково не стерти
            необов&apos;язкові поля, які тут не показані.
          </AlertDescription>
        </Alert>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="main">Основне</TabsTrigger>
            <TabsTrigger value="schedule">Розклад</TabsTrigger>
            <TabsTrigger value="social">Соцмережі</TabsTrigger>
            <TabsTrigger value="translations">Переклади</TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-4">
            <TextField control={form.control} name="address" label="Адреса" />
            <TextField control={form.control} name="phone" label="Телефон" />
            <TextField control={form.control} name="email" label="Email" type="email" />
            <TextField control={form.control} name="logoImageId" label="ID логотипу" description="Stage 1: ID з медіатеки" />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-3">
            <Controller
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <div className="space-y-2">
                  {(field.value ?? []).map((entry, index) => (
                    <div key={entry.id} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                      <Input
                        placeholder="День (напр. Неділя)"
                        value={entry.dayLabel}
                        onChange={(e) => {
                          const next = [...field.value];
                          next[index] = { ...entry, dayLabel: e.target.value };
                          field.onChange(next);
                        }}
                      />
                      <Input
                        placeholder="Богослужіння"
                        value={entry.serviceName}
                        onChange={(e) => {
                          const next = [...field.value];
                          next[index] = { ...entry, serviceName: e.target.value };
                          field.onChange(next);
                        }}
                      />
                      <Input
                        placeholder="Час"
                        className="sm:w-24"
                        value={entry.time}
                        onChange={(e) => {
                          const next = [...field.value];
                          next[index] = { ...entry, time: e.target.value };
                          field.onChange(next);
                        }}
                      />
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => field.onChange(field.value.filter((_, i) => i !== index))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => field.onChange([...(field.value ?? []), { id: newId("sch"), dayLabel: "", serviceName: "", time: "" }])}
                  >
                    <Plus className="size-4" />
                    Додати рядок розкладу
                  </Button>
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="social" className="space-y-3">
            <Controller
              control={form.control}
              name="socialLinks"
              render={({ field }) => (
                <div className="space-y-2">
                  {(field.value ?? []).map((entry, index) => (
                    <div key={entry.id} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_2fr_auto]">
                      <Input
                        placeholder="Платформа"
                        value={entry.platform}
                        onChange={(e) => {
                          const next = [...field.value];
                          next[index] = { ...entry, platform: e.target.value };
                          field.onChange(next);
                        }}
                      />
                      <Input
                        placeholder="https://…"
                        value={entry.url}
                        onChange={(e) => {
                          const next = [...field.value];
                          next[index] = { ...entry, url: e.target.value };
                          field.onChange(next);
                        }}
                      />
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => field.onChange(field.value.filter((_, i) => i !== index))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => field.onChange([...(field.value ?? []), { id: newId("soc"), platform: "", url: "" }])}
                  >
                    <Plus className="size-4" />
                    Додати посилання
                  </Button>
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="translations" className="space-y-4">
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
            <TextField control={form.control} name={`translations.${translationTab}.name`} label="Назва храму" />
            <TextField control={form.control} name={`translations.${translationTab}.description`} label="Опис" textarea rows={3} />
            <TextField control={form.control} name={`translations.${translationTab}.history`} label="Історія" textarea rows={6} />
            <TextField control={form.control} name={`translations.${translationTab}.seoTitle`} label="SEO-заголовок" />
            <TextField control={form.control} name={`translations.${translationTab}.seoDescription`} label="SEO-опис" textarea rows={2} />
          </TabsContent>
        </Tabs>
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
