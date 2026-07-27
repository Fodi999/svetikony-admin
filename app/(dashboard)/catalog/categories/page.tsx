import { RequireAccess } from "@/components/layout/require-access";
import { CategoryListView } from "@/features/catalog/category-list-view";

export default function CategoriesPage() {
  return (
    <RequireAccess area="catalog">
      <CategoryListView />
    </RequireAccess>
  );
}
