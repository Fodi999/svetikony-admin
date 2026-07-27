import type { AuthUser } from "@/types/entities";

/**
 * Stage-1 ONLY: session is kept in sessionStorage (cleared when the tab
 * closes) purely so the mock login flow has somewhere to persist state
 * across navigations. Stage 2 replaces this entirely with an HttpOnly,
 * Secure, SameSite cookie set by a BFF route — no client JS will read or
 * write the real session token.
 */

const SESSION_KEY = "svetikony-admin.mock-session";

export interface StoredSession {
  user: AuthUser;
  expiresAt: string;
}

export function readMockSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writeMockSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearMockSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
}

export type SessionState = "valid" | "expired" | "none";

/** Distinguishes "never logged in" from "was logged in, now expired" for the UI. */
export function peekMockSessionState(): SessionState {
  if (typeof window === "undefined") return "none";
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return "none";
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return new Date(parsed.expiresAt).getTime() <= Date.now() ? "expired" : "valid";
  } catch {
    return "none";
  }
}

/** Dev/QA helper to exercise the "session expired" UI without waiting hours. */
export function forceExpireMockSession(): void {
  if (typeof window === "undefined") return;
  const current = readMockSession();
  if (!current) return;
  writeMockSession({ ...current, expiresAt: new Date(Date.now() - 1000).toISOString() });
}
