import { RequireAccess } from "@/components/layout/require-access";
import { ProductListView } from "@/features/catalog/product-list-view";

export default function ProductsPage() {
  return (
    <RequireAccess area="catalog">
      <ProductListView />
    </RequireAccess>
  );
}
