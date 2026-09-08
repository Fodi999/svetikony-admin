"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { RequireAccess } from "@/components/layout/require-access";
import { ArticleForm } from "@/features/articles/article-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import type { ArticleFormValues } from "@/lib/validation/article.schema";
import type { Language } from "@/types/entities";

export default function NewArticlePage() {
  return (
    <Suspense fallback={null}>
      <NewArticlePageInner />
    </Suspense>
  );
}

function NewArticlePageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;
  const language = (searchParams.get("language") as Language | null) ?? undefined;
  const slug = searchParams.get("slug") ?? undefined;

  const createMutation = useMutation({
    mutationFn: (values: ArticleFormValues) =>
      groupId && language
        ? apiClient.articles.createTranslation!(groupId, language, values)
        : apiClient.articles.create(values),
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
