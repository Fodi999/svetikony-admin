"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { StateMessage } from "@/components/feedback/state-message";
import { RequireAccess } from "@/components/layout/require-access";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleForm } from "@/features/articles/article-form";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { messages } from "@/lib/i18n";
import type { ArticleFormValues } from "@/lib/validation/article.schema";

export default function EditArticlePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canEdit } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const query = useQuery({
    queryKey: ["articles", params.id],
    queryFn: () => apiClient.articles.get(params.id),
  });

  const updateMutation = useMutation({
    mutationFn: (values: ArticleFormValues) => apiClient.articles.update(params.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Зміни збережено");
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.articles.remove(params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Статтю видалено");
      router.push("/articles");
    },
    onError: (error) => toast.error(errorMessageFor(error)),
  });

  return (
    <RequireAccess area="content">
      {query.isLoading ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-40" />
        </div>
      ) : query.isError ? (
        <div className="p-4">
          <StateMessage
            variant="error"
            title={messages.states.errorTitle}
            description={errorMessageFor(query.error)}
            action={{ label: messages.actions.retry, onClick: () => query.refetch() }}
          />
        </div>
      ) : query.data ? (
        <>
          <ArticleForm
            mode="edit"
            article={query.data}
            submitting={updateMutation.isPending}
            onSubmit={async (values) => {
              await updateMutation.mutateAsync(values);
            }}
            onDelete={canEdit("content") ? () => setConfirmDelete(true) : undefined}
          />
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Видалити статтю?"
            description={`«${query.data.title}» буде видалено безповоротно.`}
            destructive
            confirmLabel={messages.actions.delete}
            onConfirm={() => deleteMutation.mutate()}
          />
        </>
      ) : null}
    </RequireAccess>
  );
}
