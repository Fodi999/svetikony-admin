import { RequireAccess } from "@/components/layout/require-access";
import { SettingsView } from "@/features/settings/settings-view";

export default function SettingsPage() {
  return (
    <RequireAccess area="settings">
      <SettingsView />
    </RequireAccess>
  );
}
