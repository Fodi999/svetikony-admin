"use client";

import { useCallback, useSyncExternalStore } from "react";

/** In-memory pub/sub so same-tab writes notify subscribers immediately (storage events don't fire in the writing tab). */
const emitter = new EventTarget();

function readStorage(area: "local" | "session", key: string): boolean {
  const store = area === "local" ? window.localStorage : window.sessionStorage;
  return store.getItem(key) === "true";
}

/** Boolean UI preference backed by local/session storage, hydration-safe via useSyncExternalStore. */
export function usePersistentToggle(
  key: string,
  area: "local" | "session" = "local",
): readonly [boolean, (next: boolean) => void] {
  const subscribe = useCallback(
    (callback: () => void) => {
      emitter.addEventListener(key, callback);
      return () => emitter.removeEventListener(key, callback);
    },
    [key],
  );
  const getSnapshot = useCallback(() => readStorage(area, key), [area, key]);
  const getServerSnapshot = useCallback(() => false, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: boolean) => {
      const store = area === "local" ? window.localStorage : window.sessionStorage;
      store.setItem(key, String(next));
      emitter.dispatchEvent(new Event(key));
    },
    [area, key],
  );

  return [value, setValue] as const;
}
