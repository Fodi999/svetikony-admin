"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { VisualizerEventForm } from "@/features/visualizer/visualizer-event-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { VisualizerEventFormValues } from "@/lib/validation/visualizer-event.schema";
import type { Language } from "@/types/entities";

export default function NewVisualizerEventPage() {
  return (
    <Suspense fallback={null}>
      <NewVisualizerEventPageInner />
    </Suspense>
  );
}

function NewVisualizerEventPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;
  const language = (searchParams.get("language") as Language | null) ?? undefined;
  const slug = searchParams.get("slug") ?? undefined;

  const createMutation = useMutation({
    mutationFn: (values: VisualizerEventFormValues) =>
      groupId && language
        ? apiClient.visualizerEvents.createTranslation!(groupId, language, values)
        : apiClient.visualizerEvents.create(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["visualizerEvents"] });
      toast.success("Подію створено");
      router.push(`/visualizer/${created.id}`);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="content" requireEdit>
      <VisualizerEventForm
        mode="create"
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
