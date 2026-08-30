import { RequireAccess } from "@/components/layout/require-access";
import { TelegramView } from "@/features/telegram/telegram-view";

export default function TelegramPage() {
  return (
    <RequireAccess area="telegram">
      <TelegramView />
    </RequireAccess>
  );
}
