"use client";

import { useParams } from "next/navigation";
import { RequireAccess } from "@/components/layout/require-access";
import { OrderDetailView } from "@/features/orders/order-detail-view";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAccess area="orders">
      <OrderDetailView id={params.id} />
    </RequireAccess>
  );
}
