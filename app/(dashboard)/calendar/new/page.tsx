"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { CalendarDayForm } from "@/features/calendar/calendar-day-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { httpPost } from "@/lib/api/http/transport";
import { calendarDaySchema } from "@/lib/validation/calendar.schema";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";
import type { CalendarEventType, Language } from "@/types/entities";

export default function NewCalendarDayPage() {
  return (
    <Suspense fallback={null}>
      <NewCalendarDayPageInner />
    </Suspense>
  );
}

function NewCalendarDayPageInner() {
  const router = useRouter();
  const { setDirty } = useUnsavedChanges();
  const preparing = useRef(false);
  const [preparationStatus, setPreparationStatus] = useState("");
  const [preparationError, setPreparationError] = useState("");
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  // Prefills the date when arriving from an empty month-grid slot (task
  // section 7); undefined for the ordinary "+ Додати" entry point, where
  // CalendarDayForm's own EMPTY_DEFAULTS (blank date) still applies.
  const initialDate = searchParams.get("date") ?? undefined;
  const initialEventType = (searchParams.get("eventType") as CalendarEventType | null) ?? undefined;
  const groupId = searchParams.get("groupId") ?? undefined;
  const language = (searchParams.get("language") as Language | null) ?? undefined;
  const slug = searchParams.get("slug") ?? undefined;

  const createMutation = useMutation({
    mutationFn: (values: CalendarDayFormValues) =>
      groupId && language
        ? apiClient.calendarDays.createTranslation!(groupId, language, values)
        : apiClient.calendarDays.create(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
      toast.success("Календарний день створено");
      router.push(`/calendar/${created.id}`);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });


  async function createWithAi(date: string, language: Language) {
    if (preparing.current) return;
    preparing.current = true;
    setPreparationError("");
    let createdId: string | undefined;
    try {
      setPreparationStatus("Перевірка дати…");
      const existing = await apiClient.calendarDays.list({ pageSize: 500, month: date.slice(0, 7), language });
      const match = existing.items.find((day) => day.date === date && day.language === language);
      if (match) {
        setDirty(false);
        toast.info("Запис цієї дати вже існує — відкриваємо його без змін");
        router.push(`/calendar/${match.id}`);
        return;
      }
      setPreparationStatus("1/3 · Джерело та AI-текст…");
      const prepared = await httpPost<CalendarDayFormValues & { sourceUrl: string }>("/api/bff/calendar-days/prepare-date", { date, language }, 105_000);
      const sourceLabel = language === "en" ? "Source (fixed commemorations)" : language === "ru" ? "Источник (неподвижные памяти)" : "Джерело (нерухомі пам’яті)";
      const values = calendarDaySchema.parse({ ...prepared, status: "draft", history: `${prepared.history}\n\n${sourceLabel}: ${prepared.sourceUrl}` });
      setPreparationStatus("2/3 · Збереження чернетки…");
      const created = await apiClient.calendarDays.create(values);
      createdId = created.id;
      setPreparationStatus("3/3 · Генерація AI-фото…");
      await apiClient.calendarDays.generateImage(created.id);
      toast.success("Чернетку з текстом і фото створено. Перевірте перед публікацією.");
    } catch (error) {
      const message = createdId ? "Текст збережено як чернетку, але фото не згенеровано. Повторіть генерацію у вкладці Медіа." : errorMessageFor(error);
      setPreparationError(message);
      toast.error(message);
    } finally {
      preparing.current = false;
      setPreparationStatus("");
      if (createdId) {
        setDirty(false);
        await queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
        router.push(`/calendar/${createdId}`);
      }
    }
  }

  return (
    <RequireAccess area="content" requireEdit>
      {preparationError ? <p role="alert" className="mx-6 mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{preparationError}</p> : null}
      <CalendarDayForm
        mode="create"
        initialDate={initialDate}
        initialEventType={initialEventType}
        groupId={groupId}
        initialLanguage={language}
        initialSlug={slug}
        submitting={createMutation.isPending || Boolean(preparationStatus)}
        preparationStatus={preparationStatus}
        onCreateWithAi={createWithAi}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </RequireAccess>
  );
}
