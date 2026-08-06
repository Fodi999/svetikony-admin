"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Перемкнути тему"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="size-11"
    >
      {resolvedTheme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
