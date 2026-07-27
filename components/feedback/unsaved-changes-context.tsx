"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { messages } from "@/lib/i18n";

interface UnsavedChangesContextValue {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  /** Runs `action` immediately if there are no unsaved changes; otherwise asks for confirmation first. */
  guardNavigation: (action: () => void) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const guardNavigation = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      pendingAction.current = action;
      setConfirmOpen(true);
    },
    [isDirty],
  );

  const value = useMemo<UnsavedChangesContextValue>(
    () => ({ isDirty, setDirty: setIsDirty, guardNavigation }),
    [isDirty, guardNavigation],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={messages.states.unsavedTitle}
        description={messages.states.unsavedDescription}
        confirmLabel="Покинути сторінку"
        cancelLabel="Залишитися"
        destructive
        onConfirm={() => {
          setIsDirty(false);
          pendingAction.current?.();
          pendingAction.current = null;
        }}
      />
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const context = useContext(UnsavedChangesContext);
  if (!context) throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider");
  return context;
}
