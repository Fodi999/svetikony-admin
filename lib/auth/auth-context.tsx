"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { toApiError } from "@/lib/api/errors";
import { accessLevel, canEdit, canView, type PermissionArea } from "@/lib/auth/permissions";
import { peekMockSessionState } from "@/lib/auth/session";
import type { LoginFormValues } from "@/lib/validation/auth.schema";
import type { AuthUser } from "@/types/entities";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "expired";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (values: LoginFormValues) => Promise<void>;
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
      const session = await apiClient.auth.getSession();
      if (cancelled) return;
      if (session) {
        setUser(session.user);
        setStatus("authenticated");
        return;
      }
      setUser(null);
      setStatus(peekMockSessionState() === "expired" ? "expired" : "unauthenticated");
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
    } catch (error) {
      // Login errors already carry a precise, user-facing message (e.g. "wrong
      // email or password") — don't flatten it through the generic per-code
      // mapping, which would relabel it as a stale/expired session instead.
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
      logout,
      canView: (area) => (user ? canView(user.role, area) : false),
      canEdit: (area) => (user ? canEdit(user.role, area) : false),
      accessLevel: (area) => (user ? accessLevel(user.role, area) : "none"),
    }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
