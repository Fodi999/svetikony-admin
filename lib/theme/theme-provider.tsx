"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "theme";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
  } catch {
    return "system";
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

/**
 * Hand-rolled replacement for next-themes. next-themes prevents flash-of-
 * wrong-theme by serializing its internal script function via
 * `Function.prototype.toString()` and injecting it as an inline <script>.
 * Cloudflare's build pipeline (opennextjs-cloudflare's esbuild bundling,
 * run with keepNames) rewrites that function to call a `__name(...)`
 * helper for stack-trace friendliness, and the extracted `.toString()`
 * text carries the call but not the helper's definition, producing
 * `ReferenceError: __name is not defined` in production. Our flash-
 * prevention script below is authored as a plain string, never derived
 * from a live function object, so it can't be corrupted this way.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemTheme(getSystemTheme());
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}")||"system";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var d=document.documentElement;d.classList.add(r);d.style.colorScheme=r}catch(e){}})();`,
        }}
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
