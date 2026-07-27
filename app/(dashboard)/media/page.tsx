import { RequireAccess } from "@/components/layout/require-access";
import { MediaLibraryView } from "@/features/media/media-library-view";

export default function MediaPage() {
  return (
    <RequireAccess area="media">
      <MediaLibraryView />
    </RequireAccess>
  );
}
