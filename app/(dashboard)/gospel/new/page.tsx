"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { GospelForm } from "@/features/gospel/gospel-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { GospelReadingFormValues } from "@/lib/validation/gospel.schema";
import type { Language } from "@/types/entities";

export default function NewGospelPage() {
  return (
    <Suspense fallback={null}>
      <NewGospelPageInner />
    </Suspense>
  );
}

function NewGospelPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;
  const language = (searchParams.get("language") as Language | null) ?? undefined;
  const slug = searchParams.get("slug") ?? undefined;

  const createMutation = useMutation({
    mutationFn: (values: GospelReadingFormValues) =>
      groupId && language
        ? apiClient.gospelReadings.createTranslation!(groupId, language, values)
        : apiClient.gospelReadings.create(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["gospelReadings"] });
      toast.success("Читання створено");
      router.push(`/gospel/${created.id}`);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="content" requireEdit>
      <GospelForm
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
