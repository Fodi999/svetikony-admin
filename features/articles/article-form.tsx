"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { RelationPickerField } from "@/components/forms/relation-picker-field";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api";
import { LANGUAGE_LABELS } from "@/lib/constants/labels";
import { messages } from "@/lib/i18n";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { cn } from "@/lib/utils";
import { articleSchema, type ArticleFormValues } from "@/lib/validation/article.schema";
import type { Article } from "@/types/entities";

const EMPTY_DEFAULTS: ArticleFormValues = {
  title: "",
  slug: "",
  language: "uk",
  content: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
  coverImageId: undefined,
  relatedIconIds: [],
  relatedSaintIds: [],
};

interface ArticleFormProps {
  mode: "create" | "edit";
  article?: Article;
  onSubmit: (values: ArticleFormValues) => Promise<void>;
  onDelete?: () => void;
  submitting?: boolean;
}

function SeoCounter({ length, max }: { length: number; max: number }) {
  return (
    <p className={cn("text-xs", length > max ? "text-destructive" : "text-muted-foreground")}>
      {length}/{max} символів
    </p>
  );
}

export function ArticleForm({ mode, article, onSubmit, onDelete, submitting }: ArticleFormProps) {
  const { setDirty } = useUnsavedChanges();
  const [tab, setTab] = useState("main");
  const [previewOpen, setPreviewOpen] = useState(false);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: article ? { ...EMPTY_DEFAULTS, ...article } : EMPTY_DEFAULTS,
  });

  useEffect(() => {
    const subscription = form.watch(() => setDirty(form.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [form, setDirty]);

  useBeforeUnloadWarning(form.formState.isDirty);

  const iconsQuery = useQuery({ queryKey: ["icons", "options"], queryFn: () => apiClient.icons.list({ pageSize: 200 }) });
  const saintsQuery = useQuery({ queryKey: ["saints", "options"], queryFn: () => apiClient.saints.list({ pageSize: 200 }) });
  const iconOptions = (iconsQuery.data?.items ?? []).map((i) => ({ value: i.id, label: i.title }));
  const saintOptions = (saintsQuery.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }));

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
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="main">Основне</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="relations">Зв&apos;язки</TabsTrigger>
            <TabsTrigger value="publication">Публікація</TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-4">
            <TextField control={form.control} name="title" label="Назва" />
            <TextField control={form.control} name="slug" label="Slug" description="Латиниця, цифри, дефіси" />
            <SelectField
              control={form.control}
              name="language"
              label="Мова"
              options={Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <TextField control={form.control} name="content" label="Зміст статті" textarea rows={12} />
            <TextField control={form.control} name="coverImageId" label="ID обкладинки" description="Stage 1: ID з медіатеки" />
          </TabsContent>

          <TabsContent value="seo" className="space-y-2">
            <TextField control={form.control} name="seoTitle" label="SEO-заголовок" />
            <SeoCounter length={values.seoTitle?.length ?? 0} max={70} />
            <div className="pt-2">
              <TextField control={form.control} name="seoDescription" label="SEO-опис" textarea rows={3} />
              <SeoCounter length={values.seoDescription?.length ?? 0} max={160} />
            </div>
          </TabsContent>

          <TabsContent value="relations" className="space-y-4">
            <RelationPickerField control={form.control} name="relatedIconIds" label="Пов'язані ікони" options={iconOptions} />
            <RelationPickerField control={form.control} name="relatedSaintIds" label="Пов'язані святі" options={saintOptions} />
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
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{values.content || "Зміст ще не додано."}</p>
            <Button className="mt-4 h-11 w-full" variant="outline" onClick={() => setPreviewOpen(false)}>
              Закрити
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
