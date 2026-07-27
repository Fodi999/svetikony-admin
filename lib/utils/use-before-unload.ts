"use client";

import { useEffect } from "react";

/** Warns on tab close/reload when there are unsaved changes (in-app navigation is handled separately). */
export function useBeforeUnloadWarning(shouldWarn: boolean): void {
  useEffect(() => {
    if (!shouldWarn) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [shouldWarn]);
}
