import { RequireAccess } from "@/components/layout/require-access";
import { PrayerListView } from "@/features/prayers/prayer-list-view";

export default function PrayersPage() {
  return (
    <RequireAccess area="content">
      <PrayerListView />
    </RequireAccess>
  );
}
