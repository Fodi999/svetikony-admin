import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";
import type { PrecacheEntry } from "serwist";

// Typed narrowly (rather than as the full `ServiceWorkerGlobalScope`) so this
// file can be checked under the app's "dom" tsconfig lib without pulling in
// "webworker", which declares a conflicting global `self`.
declare const self: typeof globalThis & {
  __SW_MANIFEST?: (PrecacheEntry | string)[];
  skipWaiting: () => void;
};

/**
 * Stage 1: caches the app shell only. Runtime caching of GET API responses
 * is a Stage 2 concern (see PWA section of the spec) — do not add
 * production API routes to runtimeCaching until Stage 2.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Intentionally NOT skipWaiting/clientsClaim: the UI shows an "Update now"
  // prompt (see lib/pwa/use-service-worker-update.ts) and only activates a
  // new worker once the user confirms. clientsClaim additionally must stay
  // false because claiming an already-open, uncontrolled page mid-session
  // flips its fetches over to SW interception without a reload — which can
  // race with an in-flight client-side navigation (e.g. right after login)
  // and cause Next.js's router to fall back to a full-page reload.
  skipWaiting: false,
  clientsClaim: false,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

self.addEventListener("message", (event) => {
  if ((event as MessageEvent).data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

serwist.addEventListeners();
