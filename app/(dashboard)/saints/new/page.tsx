"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { SaintForm } from "@/features/saints/saint-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { SaintFormValues } from "@/lib/validation/saint.schema";
import type { Language } from "@/types/entities";

export default function NewSaintPage() {
  return (
    <Suspense fallback={null}>
      <NewSaintPageInner />
    </Suspense>
  );
}

function NewSaintPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;
  const language = (searchParams.get("language") as Language | null) ?? undefined;
  const slug = searchParams.get("slug") ?? undefined;

  const createMutation = useMutation({
    mutationFn: (values: SaintFormValues) =>
      groupId && language
        ? apiClient.saints.createTranslation!(groupId, language, values)
        : apiClient.saints.create(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["saints"] });
      toast.success("Святого створено");
      router.push(`/saints/${created.id}`);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="content" requireEdit>
      <SaintForm
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
