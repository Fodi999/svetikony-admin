"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { SaintForm } from "@/features/saints/saint-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { SaintFormValues } from "@/lib/validation/saint.schema";

export default function NewSaintPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: SaintFormValues) => apiClient.saints.create(values),
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
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </RequireAccess>
  );
}
