"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { StateMessage } from "@/components/feedback/state-message";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";
import { RequireAccess } from "@/components/layout/require-access";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalPanel } from "@/features/ai-proposals/proposal-panel";
import { CalendarDayForm } from "@/features/calendar/calendar-day-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { messages } from "@/lib/i18n";
import type { CalendarDayFormValues } from "@/lib/validation/calendar.schema";

export default function EditCalendarDayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = useAuth();
  const { guardNavigation } = useUnsavedChanges();
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

  const query = useQuery({
    queryKey: ["calendarDays", params.id],
    queryFn: () => apiClient.calendarDays.get(params.id),
  });

  const updateMutation = useMutation({
    mutationFn: (values: CalendarDayFormValues) => apiClient.calendarDays.update(params.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarDays"] });
      toast.success("Зміни збережено");
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
      ) : query.data ? (
        <>
          {canEdit("settings") ? (
            <ProposalPanel
              targetId={params.id}
              onApplied={async () => {
                await query.refetch({ throwOnError: true });
                setFormRevision((x) => x + 1);
              }}
            />
          ) : null}
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
            key={`${query.data.id}-${formRevision}`}
            mode="edit"
            day={query.data}
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
            description={`«${query.data.title}» буде видалено безповоротно.`}
            destructive
            confirmLabel={messages.actions.delete}
            onConfirm={() => deleteMutation.mutate()}
          />
        </>
      ) : null}
    </RequireAccess>
  );
}
