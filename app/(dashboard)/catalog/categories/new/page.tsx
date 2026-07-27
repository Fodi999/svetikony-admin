"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { CategoryForm } from "@/features/catalog/category-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { ProductCategoryFormValues } from "@/lib/validation/category.schema";

export default function NewCategoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: ProductCategoryFormValues) => apiClient.categories.create(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Категорію створено");
      router.push(`/catalog/categories/${created.id}`);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="catalog" requireEdit>
      <CategoryForm
        mode="create"
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </RequireAccess>
  );
}
