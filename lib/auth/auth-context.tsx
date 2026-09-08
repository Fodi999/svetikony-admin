"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { toApiError } from "@/lib/api/errors";
import { accessLevel, canEdit, canView, type PermissionArea } from "@/lib/auth/permissions";
import type { LoginFormValues } from "@/lib/validation/auth.schema";
import type { AuthUser } from "@/types/entities";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "expired";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (values: LoginFormValues) => Promise<AuthUser>;
  /** Phase 3 (Telegram passwordless login): same shape/behavior as login(),
   * just exchanging a one-time ticket instead of email+password -- keeps
   * this context's own user/status state (and everything derived from it,
   * e.g. the sidebar's nav) in sync immediately, rather than leaving it
   * stale until the next full session check. */
  loginWithTelegramTicket: (ticket: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  canView: (area: PermissionArea) => boolean;
  canEdit: (area: PermissionArea) => boolean;
  accessLevel: (area: PermissionArea) => ReturnType<typeof accessLevel>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await apiClient.auth.getSession();
        if (cancelled) return;
        if (session) {
          setUser(session.user);
          setStatus("authenticated");
          return;
        }
        setUser(null);
        setStatus("unauthenticated");
      } catch {
        // A cookie was presented but the server rejected it as no longer
        // valid (getSession() rethrows only for this case, see
        // lib/api/http/auth.ts) -- distinct from "never had a session" so
        // the UI can show "please log in again" rather than a bare form.
        if (cancelled) return;
        setUser(null);
        setStatus("expired");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (values: LoginFormValues) => {
    try {
      const session = await apiClient.auth.login(values);
      setUser(session.user);
      setStatus("authenticated");
      return session.user;
    } catch (error) {
      // Login errors already carry a precise, user-facing message (e.g. "wrong
      // email or password") — don't flatten it through the generic per-code
      // mapping, which would relabel it as a stale/expired session instead.
      throw new Error(toApiError(error).message);
    }
  }, []);

  const loginWithTelegramTicket = useCallback(async (ticket: string) => {
    try {
      const session = await apiClient.auth.exchangeTelegramTicket(ticket);
      setUser(session.user);
      setStatus("authenticated");
      return session.user;
    } catch (error) {
      throw new Error(toApiError(error).message);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiClient.auth.logout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      loginWithTelegramTicket,
      logout,
      canView: (area) => (user ? canView(user.role, area) : false),
      canEdit: (area) => (user ? canEdit(user.role, area) : false),
      accessLevel: (area) => (user ? accessLevel(user.role, area) : "none"),
    }),
    [user, status, login, loginWithTelegramTicket, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
