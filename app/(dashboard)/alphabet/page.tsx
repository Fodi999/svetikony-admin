import { RequireAccess } from "@/components/layout/require-access";
import { AlphabetGridView } from "@/features/alphabet/alphabet-grid-view";

export default function AlphabetPage() {
  return (
    <RequireAccess area="content">
      <AlphabetGridView />
    </RequireAccess>
  );
}
