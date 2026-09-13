"use client";

import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { StateMessage } from "@/components/feedback/state-message";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { RequireAccess } from "@/components/layout/require-access";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { proposalRequest } from "@/features/ai-proposals/proposal-panel";
import { CalendarDayForm } from "@/features/calendar/calendar-day-form";
import { calendarDayFromDto } from "@/lib/api/http/calendar-days";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { messages } from "@/lib/i18n";
import type { CalendarDay } from "@/types/entities";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";

export default function EditCalendarDayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = useAuth();
  const aiBusy = useIsMutating({ mutationKey: ["calendar-ai", params.id] }) > 0;
  const { guardNavigation, isDirty } = useUnsavedChanges();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Bumped whenever the form must show freshly-fetched values instead of
  // whatever it currently holds (a proposal was applied, or the admin asked
  // for a manual refresh) -- combined with the record id below into the
  // form's `key` so React Hook Form's mount-time `defaultValues` are always
  // re-evaluated against the latest `query.data`, never a stale instance
  // left over from a previous id (SPA navigation between calendar days does
  // not otherwise remount this component; see calendar-day-form.tsx's own
  // notes on this bug).
  const [formRevision, setFormRevision] = useState(0);
  const [review, setReview] = useState<{day: CalendarDay; working: Record<string, unknown>; version: string} | null>(null);

  const query = useQuery({
    queryKey: ["calendarDays", params.id],
    queryFn: async () => {
      const editor = await proposalRequest(`/editor/calendar/${params.id}`);
      return { ...editor, day: calendarDayFromDto(editor.working) };
    },
    refetchOnWindowFocus: false,
    refetchInterval: isDirty || aiBusy ? false : 15000,
    enabled: !isDirty && !aiBusy,
  });

  if (query.data && !isDirty && !aiBusy && review !== query.data) setReview(query.data);

  const updateMutation = useMutation({
    mutationFn: (values: CalendarDayFormValues) => proposalRequest(`/editor/calendar/${params.id}`, {
      version: review!.version,
      confirmation: `PUBLISH ${params.id}`,
      patch: {
        title: values.title, description: values.shortDescription, history: values.history || "",
        imageUrl: values.imageId || "", seoTitle: values.seoTitle ?? null, seoDescription: values.seoDescription ?? null,
        dateNewStyle: values.date,
        dayType: values.eventType === review!.day.eventType ? review!.working.dayType : values.eventType,
        ...(values.imageId !== review!.working.imageUrl || !review!.working.imageMetadata ||
          (review!.working.imageMetadata as {origin?: string; identityVerified?: boolean}).origin === "ai_generated" &&
          (review!.working.imageMetadata as {identityVerified?: boolean}).identityVerified === false
          ? {imageMetadata: values.imageId === review!.working.imageUrl ? review!.working.imageMetadata ?? null : null} : {}),
      },
    }),
    onSuccess: () => {
      toast.success("Опубліковано");
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.calendarDays.remove(params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
      toast.success("Календарний день видалено");
      router.push("/calendar");
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="content">
      {query.isLoading ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-40" />
        </div>
      ) : query.isError ? (
        <div className="p-4">
          <StateMessage
            variant="error"
            title={messages.states.errorTitle}
            description={errorMessageFor(query.error)}
            action={{ label: messages.actions.retry, onClick: () => query.refetch() }}
          />
        </div>
      ) : review ? (
        <>
          <div className="flex justify-end px-4 pt-4 md:px-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                guardNavigation(() => {
                  void query.refetch({ throwOnError: true }).then(() => setFormRevision((x) => x + 1));
                })
              }
            >
              Оновити дані із сервера
            </Button>
          </div>
          <CalendarDayForm
            key={`${review!.day.id}-${review!.version}-${formRevision}`}
            mode="edit"
            day={review!.day}
            workingCopy
            onSaved={async () => {
              await query.refetch({ throwOnError: true });
              await queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
              setFormRevision((x) => x + 1);
            }}
            submitting={updateMutation.isPending}
            onSubmit={async (values) => {
              await updateMutation.mutateAsync(values);
            }}
            onDelete={canEdit("content") ? () => setConfirmDelete(true) : undefined}
          />
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Видалити календарний день?"
            description={`«${review!.day.title}» буде видалено безповоротно.`}
            destructive
            confirmLabel={messages.actions.delete}
            onConfirm={() => deleteMutation.mutate()}
          />
        </>
      ) : null}
    </RequireAccess>
  );
}
