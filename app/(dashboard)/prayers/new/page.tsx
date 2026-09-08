"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { PrayerForm } from "@/features/prayers/prayer-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { PrayerFormValues } from "@/lib/validation/prayer.schema";
import type { Language } from "@/types/entities";

export default function NewPrayerPage() {
  return (
    <Suspense fallback={null}>
      <NewPrayerPageInner />
    </Suspense>
  );
}

function NewPrayerPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;
  const language = (searchParams.get("language") as Language | null) ?? undefined;
  const slug = searchParams.get("slug") ?? undefined;

  const createMutation = useMutation({
    mutationFn: (values: PrayerFormValues) =>
      groupId && language
        ? apiClient.prayers.createTranslation!(groupId, language, values)
        : apiClient.prayers.create(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["prayers"] });
      toast.success("Молитву створено");
      router.push(`/prayers/${created.id}`);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="content" requireEdit>
      <PrayerForm
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
