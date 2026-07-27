"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { ProductForm } from "@/features/catalog/product-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { ProductFormValues } from "@/lib/validation/product.schema";

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) => apiClient.products.create(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Товар створено");
      router.push(`/catalog/products/${created.id}`);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="catalog" requireEdit>
      <ProductForm
        mode="create"
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </RequireAccess>
  );
}
