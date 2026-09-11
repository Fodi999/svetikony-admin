"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { CalendarDayForm } from "@/features/calendar/calendar-day-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
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

  return (
    <RequireAccess area="content" requireEdit>
      <CalendarDayForm
        mode="create"
        initialDate={initialDate}
        initialEventType={initialEventType}
        groupId={groupId}
        initialLanguage={language}
        initialSlug={slug}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </RequireAccess>
  );
}
