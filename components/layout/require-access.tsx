"use client";

import { useRouter } from "next/navigation";
import { StateMessage } from "@/components/feedback/state-message";
import { useAuth } from "@/lib/auth/auth-context";
import { messages } from "@/lib/i18n";
import type { PermissionArea } from "@/lib/auth/permissions";

export function RequireAccess({
  area,
  requireEdit,
  children,
}: {
  area: PermissionArea;
  requireEdit?: boolean;
  children: React.ReactNode;
}) {
  const { canView, canEdit } = useAuth();
  const router = useRouter();
  const allowed = requireEdit ? canEdit(area) : canView(area);

  if (!allowed) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <StateMessage
          variant="forbidden"
          title={messages.states.forbiddenTitle}
          description={messages.states.forbiddenDescription}
          action={{ label: "На головну", onClick: () => router.push("/") }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
