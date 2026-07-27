"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { ArticleForm } from "@/features/articles/article-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { ArticleFormValues } from "@/lib/validation/article.schema";

export default function NewArticlePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: ArticleFormValues) => apiClient.articles.create(values),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Статтю створено");
      router.push(`/articles/${created.id}`);
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="content" requireEdit>
      <ArticleForm
        mode="create"
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </RequireAccess>
  );
}
