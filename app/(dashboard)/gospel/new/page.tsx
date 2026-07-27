"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { GospelForm } from "@/features/gospel/gospel-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { GospelReadingFormValues } from "@/lib/validation/gospel.schema";

export default function NewGospelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: GospelReadingFormValues) => apiClient.gospelReadings.create(values),
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
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </RequireAccess>
  );
}
