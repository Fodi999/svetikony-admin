"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { AlphabetLetterFormComponent } from "@/features/alphabet/alphabet-letter-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { AlphabetLetterFormValues } from "@/lib/validation/alphabet.schema";

export default function NewAlphabetLetterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: AlphabetLetterFormValues) => apiClient.alphabetLetters.create(values),
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
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </RequireAccess>
  );
}
