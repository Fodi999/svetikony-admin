"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { AlphabetLetterFormComponent } from "@/features/alphabet/alphabet-letter-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { AlphabetLetterFormValues } from "@/lib/validation/alphabet.schema";
import type { Language } from "@/types/entities";

export default function NewAlphabetLetterPage() {
  return (
    <Suspense fallback={null}>
      <NewAlphabetLetterPageInner />
    </Suspense>
  );
}

function NewAlphabetLetterPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;
  const language = (searchParams.get("language") as Language | null) ?? undefined;
  const slug = searchParams.get("slug") ?? undefined;

  const createMutation = useMutation({
    mutationFn: (values: AlphabetLetterFormValues) =>
      groupId && language
        ? apiClient.alphabetLetters.createTranslation!(groupId, language, values)
        : apiClient.alphabetLetters.create(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["alphabetLetters"] });
      toast.success("Букву створено");
      router.push(`/alphabet/${created.id}`);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="content" requireEdit>
      <AlphabetLetterFormComponent
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
