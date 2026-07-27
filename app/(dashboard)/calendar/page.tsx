import { RequireAccess } from "@/components/layout/require-access";
import { CalendarListView } from "@/features/calendar/calendar-list-view";

export default function CalendarPage() {
  return (
    <RequireAccess area="content">
      <CalendarListView />
    </RequireAccess>
  );
}
