"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { PrayerForm } from "@/features/prayers/prayer-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { PrayerFormValues } from "@/lib/validation/prayer.schema";

export default function NewPrayerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: PrayerFormValues) => apiClient.prayers.create(values),
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
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </RequireAccess>
  );
}
