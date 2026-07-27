"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useServiceWorkerUpdate } from "@/lib/pwa/use-service-worker-update";

export function PwaUpdateListener() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  const shown = useRef(false);

  useEffect(() => {
    if (!updateAvailable || shown.current) return;
    shown.current = true;
    toast("Доступна нова версія застосунку", {
      duration: Infinity,
      action: {
        label: "Оновити зараз",
        onClick: applyUpdate,
      },
    });
  }, [updateAvailable, applyUpdate]);

  return null;
}
