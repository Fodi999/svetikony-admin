"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { CalendarDayForm } from "@/features/calendar/calendar-day-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";

export default function NewCalendarDayPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Prefills the date when arriving from an empty month-grid slot (task
  // section 7); undefined for the ordinary "+ Додати" entry point, where
  // CalendarDayForm's own EMPTY_DEFAULTS (blank date) still applies.
  const initialDate = useSearchParams().get("date") ?? undefined;

  const createMutation = useMutation({
    mutationFn: (values: CalendarDayFormValues) => apiClient.calendarDays.create(values),
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
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </RequireAccess>
  );
}
