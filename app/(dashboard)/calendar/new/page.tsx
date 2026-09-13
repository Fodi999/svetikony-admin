"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { CalendarDayForm } from "@/features/calendar/calendar-day-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { prepareCalendarLanguages } from "@/features/calendar/prepare-calendar-languages";
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
    try {
      setPreparationStatus("Перевірка перекладів UK/RU/EN…");
      const id = await prepareCalendarLanguages(date, language, groupId, setPreparationStatus);
      setDirty(false);
      toast.success("Переклади підготовлено. Нові записи збережено як чернетки; перевірте перед публікацією.");
      router.push(`/calendar/${id}`);
    } catch (error) {
      const message = errorMessageFor(error);
      setPreparationError(message);
      toast.error(message);
    } finally {
      preparing.current = false;
      setPreparationStatus("");
      await queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
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
