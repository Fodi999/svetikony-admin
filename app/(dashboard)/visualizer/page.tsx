import { RequireAccess } from "@/components/layout/require-access";
import { VisualizerEventListView } from "@/features/visualizer/visualizer-event-list-view";

export default function VisualizerPage() {
  return (
    <RequireAccess area="content">
      <VisualizerEventListView />
    </RequireAccess>
  );
}
