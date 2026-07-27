import { RequireAccess } from "@/components/layout/require-access";
import { ArticleListView } from "@/features/articles/article-list-view";

export default function ArticlesPage() {
  return (
    <RequireAccess area="content">
      <ArticleListView />
    </RequireAccess>
  );
}
