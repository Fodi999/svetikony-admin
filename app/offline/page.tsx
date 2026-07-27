"use client";

import { StateMessage } from "@/components/feedback/state-message";
import { messages } from "@/lib/i18n";

export default function OfflinePage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <StateMessage
        variant="offline"
        title={messages.states.offlineTitle}
        description={messages.states.offlineDescription}
        action={{ label: messages.actions.retry, onClick: () => window.location.reload() }}
      />
    </div>
  );
}
