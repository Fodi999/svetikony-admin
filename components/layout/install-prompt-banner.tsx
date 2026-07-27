"use client";

import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/lib/pwa/use-install-prompt";
import { usePersistentToggle } from "@/lib/utils/use-persistent-toggle";

const DISMISS_KEY = "svetikony-admin.install-banner-dismissed";

export function InstallPromptBanner() {
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = usePersistentToggle(DISMISS_KEY, "session");

  if (!isInstallable || dismissed) return null;

  function dismiss() {
    setDismissed(true);
  }

  return (
    <div
      className="fixed inset-x-3 bottom-20 z-40 flex items-center gap-3 rounded-lg border bg-card p-3 shadow-lg md:inset-x-auto md:right-4 md:bottom-4 md:max-w-sm"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      role="status"
    >
      <Download className="size-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Встановити застосунок</p>
        <p className="text-xs text-muted-foreground">Швидкий доступ з головного екрана, робота офлайн.</p>
      </div>
      <Button size="sm" onClick={promptInstall}>
        Встановити
      </Button>
      <Button size="icon" variant="ghost" className="size-9 shrink-0" onClick={dismiss} aria-label="Закрити">
        <X className="size-4" />
      </Button>
    </div>
  );
}
