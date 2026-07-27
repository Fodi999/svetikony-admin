"use client";

import { useRouter } from "next/navigation";
import { StateMessage } from "@/components/feedback/state-message";
import { messages } from "@/lib/i18n";

export default function NoAccessPage() {
  const router = useRouter();
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <StateMessage
        variant="forbidden"
        title={messages.states.forbiddenTitle}
        description={messages.states.forbiddenDescription}
        action={{ label: "На головну", onClick: () => router.push("/") }}
      />
    </div>
  );
}
