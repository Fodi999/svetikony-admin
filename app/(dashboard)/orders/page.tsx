import { RequireAccess } from "@/components/layout/require-access";
import { OrderListView } from "@/features/orders/order-list-view";

export default function OrdersPage() {
  return (
    <RequireAccess area="orders">
      <OrderListView />
    </RequireAccess>
  );
}
