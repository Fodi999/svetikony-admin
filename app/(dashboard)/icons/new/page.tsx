"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { IconForm } from "@/features/icons/icon-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { IconFormValues } from "@/lib/validation/icon.schema";
import type { Language } from "@/types/entities";

export default function NewIconPage() {
  return (
    <Suspense fallback={null}>
      <NewIconPageInner />
    </Suspense>
  );
}

function NewIconPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;
  const language = (searchParams.get("language") as Language | null) ?? undefined;
  const slug = searchParams.get("slug") ?? undefined;

  const createMutation = useMutation({
    mutationFn: (values: IconFormValues) =>
      groupId && language
        ? apiClient.icons.createTranslation!(groupId, language, values)
        : apiClient.icons.create(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["icons"] });
      toast.success("Ікону створено");
      router.push(`/icons/${created.id}`);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="content" requireEdit>
      <IconForm
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
