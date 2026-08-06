"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetAllMockStores } from "@/lib/api/mock-utils";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { forceExpireMockSession } from "@/lib/auth/session";
import { mockAccounts } from "@/lib/mock-data/users";
import { useTheme } from "@/lib/theme/theme-provider";

function initialsOf(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function SettingsView() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Налаштування</h1>
        <p className="text-sm text-muted-foreground">Профіль, тема та службові дії Stage 1.</p>
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

      {user?.role === "super_admin" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Користувачі та ролі</CardTitle>
            <CardDescription>Тестові облікові записи Stage 1 (керування користувачами — Stage 2).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockAccounts.map((account) => (
              <div key={account.user.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{account.user.name}</p>
                  <p className="text-muted-foreground">{account.user.email}</p>
                </div>
                <Badge variant="outline">{ROLE_LABELS[account.user.role]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Службові дії (Stage 1)</CardTitle>
          <CardDescription>Допоміжні дії для тестування мок-адмінки. Відсутні на етапі 2.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              forceExpireMockSession();
              toast.info("Сесію позначено як завершену — перезавантажте сторінку");
            }}
          >
            Симулювати завершення сесії
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
            Скинути демо-дані
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Скинути демо-дані?"
        description="Усі зміни, зроблені в мок-даних цієї сесії, буде втрачено, і дані повернуться до початкового стану після перезавантаження."
        destructive
        confirmLabel="Скинути"
        onConfirm={() => {
          resetAllMockStores();
          toast.success("Демо-дані скинуто. Перезавантажте сторінку.");
        }}
      />
    </div>
  );
}
