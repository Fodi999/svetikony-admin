import { RequireAccess } from "@/components/layout/require-access";
import { IconListView } from "@/features/icons/icon-list-view";

export default function IconsPage() {
  return (
    <RequireAccess area="content">
      <IconListView />
    </RequireAccess>
  );
}
