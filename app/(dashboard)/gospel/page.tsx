import { RequireAccess } from "@/components/layout/require-access";
import { GospelListView } from "@/features/gospel/gospel-list-view";

export default function GospelPage() {
  return (
    <RequireAccess area="content">
      <GospelListView />
    </RequireAccess>
  );
}
