import { RequireAccess } from "@/components/layout/require-access";
import { ChurchInfoForm } from "@/features/church-info/church-info-form";

export default function ChurchInfoPage() {
  return (
    <RequireAccess area="content">
      <ChurchInfoForm />
    </RequireAccess>
  );
}
