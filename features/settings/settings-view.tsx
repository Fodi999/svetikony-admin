"use client";

import dynamic from "next/dynamic";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { useTheme } from "@/lib/theme/theme-provider";

/**
 * Compile-time-constant in a production build (see
 * features/settings/dev-tools-panel.tsx's own doc comment) -- the demo
 * accounts list and Stage-1 debug actions are never emitted into the
 * production build output, not merely unrendered.
 */
const DevToolsPanel = process.env.NODE_ENV !== "production" ? dynamic(() => import("./dev-tools-panel")) : null;

function initialsOf(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function SettingsView() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Налаштування</h1>
        <p className="text-sm text-muted-foreground">Профіль та тема.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Профіль</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback>{user ? initialsOf(user.name) : "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge variant="outline" className="mt-1">
              {user ? ROLE_LABELS[user.role] : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Тема</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(["light", "dark", "system"] as const).map((option) => (
            <Button key={option} variant={theme === option ? "default" : "outline"} size="sm" onClick={() => setTheme(option)}>
              {option === "light" ? "Світла" : option === "dark" ? "Темна" : "Системна"}
            </Button>
          ))}
        </CardContent>
      </Card>

      {DevToolsPanel && user?.role === "super_admin" ? <DevToolsPanel /> : null}
    </div>
  );
}
