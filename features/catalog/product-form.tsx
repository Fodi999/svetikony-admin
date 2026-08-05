"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Eye, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { MediaUploadButton } from "@/components/forms/media-upload-button";
import { NumberField } from "@/components/forms/number-field";
import { SelectField } from "@/components/forms/select-field";
import { SwitchField } from "@/components/forms/switch-field";
import { TextField } from "@/components/forms/text-field";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { applyApiFieldErrors } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api";
import { messages } from "@/lib/i18n";
import { useBeforeUnloadWarning } from "@/lib/utils/use-before-unload";
import { cn } from "@/lib/utils";
import { productSchema, type ProductFormValues } from "@/lib/validation/product.schema";
import type { Product } from "@/types/entities";

function newVariantId(): string {
  return `var-${Date.now().toString(36)}-${Math.round(Math.random() * 1000)}`;
}

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

const EMPTY_DEFAULTS: ProductFormValues = {
  title: "",
  slug: "",
  description: "",
  price: 0,
  currency: "UAH",
  stockStatus: "in_stock",
  featured: false,
  active: true,
  imageIds: [],
  categoryId: "",
  linkedIconId: undefined,
  dimensions: "",
  materials: "",
  productionTimeDays: 0,
  consecrated: false,
  variants: [],
  seoTitle: "",
  seoDescription: "",
};

interface ProductFormProps {
  mode: "create" | "edit";
  product?: Product;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onDelete?: () => void;
  submitting?: boolean;
}

export function ProductForm({ mode, product, onSubmit, onDelete, submitting }: ProductFormProps) {
  const { setDirty } = useUnsavedChanges();
  const [tab, setTab] = useState("main");
  const [previewOpen, setPreviewOpen] = useState(false);
  // Uploads made this session, not yet confirmed saved — distinct from the
  // form's persisted `imageIds` so an in-progress edit can never delete an
  // already-published image, only ever its own unsaved uploads.
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const pendingKeysRef = useRef<string[]>([]);
  // Only freshly-uploaded-this-session images have a resolvable preview
  // URL (from the upload response) — pre-existing imageIds on an edited
  // product only ever had their bare R2 key persisted, so those show as a
  // key chip instead of a thumbnail. Same trade-off Calendar Day's form
  // made (Stage 2H) to avoid needing a public-site-URL constant here.
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? { ...EMPTY_DEFAULTS, ...product } : EMPTY_DEFAULTS,
  });

  useEffect(() => {
    const subscription = form.watch(() => setDirty(form.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [form, setDirty]);

  useBeforeUnloadWarning(form.formState.isDirty);

  useEffect(() => {
    pendingKeysRef.current = pendingKeys;
  }, [pendingKeys]);

  // Cleans up uploads the user never saved (navigated away, closed the
  // tab, etc.) — registered once so it fires on unmount, reading the
  // latest keys via the ref above rather than a stale closure.
  useEffect(() => {
    return () => {
      pendingKeysRef.current.forEach((key) => void cleanupOrphanUpload(key));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoriesQuery = useQuery({ queryKey: ["categories", "all"], queryFn: () => apiClient.categories.list({ pageSize: 200 }) });
  const iconsQuery = useQuery({ queryKey: ["icons", "options"], queryFn: () => apiClient.icons.list({ pageSize: 200 }) });
  const categoryOptions = (categoriesQuery.data?.items ?? []).map((c) => ({ value: c.id, label: c.name }));
  const iconOptions = [{ value: "", label: "Без зв'язку" }, ...(iconsQuery.data?.items ?? []).map((i) => ({ value: i.id, label: i.title }))];

  async function handleSave(publish: boolean) {
    if (publish) form.setValue("active", true, { shouldDirty: true });
    const valid = await form.trigger();
    if (!valid) {
      toast.error(messages.states.validationTitle);
      setTab("main");
      return;
    }
    try {
      const values = form.getValues();
      await onSubmit(values);

      // The previously-persisted images (if any) not present in the final
      // list are now superseded — clean them up only after the save
      // actually succeeded, so a cancelled edit can never orphan-delete a
      // still-published image.
      if (product) {
        const removed = product.imageIds.filter((id) => !values.imageIds.includes(id));
        removed.forEach((key) => void cleanupOrphanUpload(key));
      }
      setPendingKeys([]); // now persisted — no longer orphan candidates

      setDirty(false);
    } catch (error) {
      applyApiFieldErrors(error, form.setError);
    }
  }

  const values = form.watch();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28 md:p-6 md:pb-24">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="main">Основне</TabsTrigger>
            <TabsTrigger value="media">Медіа</TabsTrigger>
            <TabsTrigger value="pricing">Ціна і склад</TabsTrigger>
            <TabsTrigger value="variants">Варіанти</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="publication">Публікація</TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-4">
            <TextField control={form.control} name="title" label="Назва" />
            <TextField control={form.control} name="slug" label="Slug" description="Латиниця, цифри, дефіси" />
            <TextField control={form.control} name="description" label="Опис" textarea rows={5} />
            <SelectField control={form.control} name="categoryId" label="Категорія" options={categoryOptions} />
            <SelectField control={form.control} name="linkedIconId" label="Пов'язана ікона" options={iconOptions} />
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <Controller
              control={form.control}
              name="imageIds"
              render={({ field }) => (
                <div className="space-y-3">
                  <MediaUploadButton
                    kind="image"
                    module="products"
                    entityId={product?.id ?? "draft"}
                    purpose="gallery"
                    label="Завантажити фото"
                    onUploaded={({ id, url }) => {
                      field.onChange([...(field.value ?? []), id]);
                      setPreviewUrls((prev) => ({ ...prev, [id]: url }));
                      setPendingKeys((prev) => [...prev, id]);
                    }}
                  />
                  {(field.value ?? []).length ? (
                    <p className="text-xs text-muted-foreground">Перше фото використовується як основне.</p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {(field.value ?? []).map((key) => (
                      <div key={key} className="space-y-1 rounded-md border p-2">
                        {previewUrls[key] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewUrls[key]} alt="" className="h-24 w-full rounded object-cover" />
                        ) : (
                          <p className="line-clamp-3 break-all text-xs text-muted-foreground">{key}</p>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            field.onChange((field.value ?? []).filter((item) => item !== key));
                            if (pendingKeysRef.current.includes(key)) {
                              void cleanupOrphanUpload(key);
                              setPendingKeys((prev) => prev.filter((item) => item !== key));
                            }
                          }}
                        >
                          <X className="size-4" />
                          Прибрати
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField control={form.control} name="price" label="Ціна" min={0} description="У тих одиницях, що повертає API — без прихованої конвертації" />
              <TextField control={form.control} name="currency" label="Валюта" placeholder="UAH" />
            </div>
            <SelectField
              control={form.control}
              name="stockStatus"
              label="Наявність"
              options={[
                { value: "in_stock", label: "В наявності" },
                { value: "made_to_order", label: "Під замовлення" },
                { value: "out_of_stock", label: "Немає в наявності" },
              ]}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="dimensions" label="Розміри" />
              <TextField control={form.control} name="materials" label="Матеріали" />
            </div>
            <NumberField control={form.control} name="productionTimeDays" label="Термін виготовлення, днів" min={0} max={365} />
            <SwitchField control={form.control} name="consecrated" label="Освячено" />
          </TabsContent>

          <TabsContent value="variants" className="space-y-3">
            <Controller
              control={form.control}
              name="variants"
              render={({ field }) => (
                <div className="space-y-2">
                  {(field.value ?? []).map((variant, index) => (
                    <div key={variant.id} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <Input
                        placeholder="Назва варіанту"
                        value={variant.label}
                        onChange={(e) => {
                          const next = [...field.value];
                          next[index] = { ...variant, label: e.target.value };
                          field.onChange(next);
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Ціна (якщо відрізняється)"
                        value={variant.priceOverride ?? ""}
                        onChange={(e) => {
                          const next = [...field.value];
                          next[index] = { ...variant, priceOverride: e.target.value === "" ? undefined : Number(e.target.value) };
                          field.onChange(next);
                        }}
                      />
                      <Input
                        placeholder="SKU"
                        value={variant.sku ?? ""}
                        onChange={(e) => {
                          const next = [...field.value];
                          next[index] = { ...variant, sku: e.target.value };
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
                    onClick={() => field.onChange([...(field.value ?? []), { id: newVariantId(), label: "" }])}
                  >
                    <Plus className="size-4" />
                    Додати варіант
                  </Button>
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="seo" className="space-y-2">
            <TextField control={form.control} name="seoTitle" label="SEO-заголовок" />
            <p className={cn("text-xs", (values.seoTitle?.length ?? 0) > 70 ? "text-destructive" : "text-muted-foreground")}>
              {values.seoTitle?.length ?? 0}/70 символів
            </p>
            <div className="pt-2">
              <TextField control={form.control} name="seoDescription" label="SEO-опис" textarea rows={3} />
              <p className={cn("text-xs", (values.seoDescription?.length ?? 0) > 160 ? "text-destructive" : "text-muted-foreground")}>
                {values.seoDescription?.length ?? 0}/160 символів
              </p>
            </div>
          </TabsContent>

          <TabsContent value="publication" className="space-y-4">
            <SwitchField control={form.control} name="active" label="Активний" description="Показувати товар у каталозі" />
            <SwitchField control={form.control} name="featured" label="Рекомендований" description="Позначити як особливий/рекомендований товар" />
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
            <p className="mt-1 text-lg font-medium">
              {values.price} {values.currency}
            </p>
            <p className="mt-2 text-sm leading-relaxed">{values.description}</p>
            <Button className="mt-4 h-11 w-full" variant="outline" onClick={() => setPreviewOpen(false)}>
              Закрити
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
