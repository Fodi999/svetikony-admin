"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetAllMockStores } from "@/lib/api/mock-utils";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { forceExpireMockSession } from "@/lib/auth/session";
import { mockAccounts } from "@/lib/mock-data/users";

/**
 * The Stage-1 mock-mode debug tools (the demo accounts list, forced
 * session-expiry, and "reset demo data") -- previously rendered unguarded
 * in features/settings/settings-view.tsx for any super_admin, in every
 * environment. Moved to its own module so its static `mockAccounts` import
 * (plaintext demo passwords) is a separate chunk, loaded only via
 * next/dynamic behind an explicit `process.env.NODE_ENV !== "production"`
 * check at the call site -- same pattern and same reasoning as
 * features/auth/dev-test-accounts-panel.tsx.
 */
export default function DevToolsPanel() {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
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
    </>
  );
}
