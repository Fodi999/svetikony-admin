import { RequireAccess } from "@/components/layout/require-access";
import { SaintListView } from "@/features/saints/saint-list-view";

export default function SaintsPage() {
  return (
    <RequireAccess area="content">
      <SaintListView />
    </RequireAccess>
  );
}
