"use client";

import { Button } from "@/components/ui/button";
import { mockAccounts } from "@/lib/mock-data/users";

/**
 * Dev-only quick-fill panel for the login form's test accounts. Lives in
 * its own module (not inline in app/(auth)/login/page.tsx) specifically so
 * it — and its static `mockAccounts` import, which carries plaintext demo
 * passwords — is its own separate chunk, loaded only via next/dynamic
 * behind an explicit `process.env.NODE_ENV !== "production"` check at the
 * call site. A runtime-only `{condition ? <Panel/> : null}` guard around an
 * *inline* component is not enough on its own: it stops the panel from
 * rendering, but doesn't guarantee a bundler drops the underlying
 * mockAccounts data from the compiled output. This module boundary + the
 * NODE_ENV-gated dynamic import at the call site together do (verified by
 * grepping .next/static/ and .next/server/ after a production build — see
 * the Phase 1B.1 report and scripts/verify-production-auth-bundle.mjs).
 */
export default function DevTestAccountsPanel({ onFill }: { onFill: (email: string, password: string) => void }) {
  return (
    <div className="space-y-2 border-t pt-4">
      <p className="text-xs font-medium text-muted-foreground">Тестові облікові записи (лише dev):</p>
      <div className="grid grid-cols-2 gap-2">
        {mockAccounts.map((account) => (
          <Button
            key={account.user.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto flex-col items-start gap-0 py-2 text-left"
            onClick={() => onFill(account.user.email, account.password)}
          >
            <span className="text-xs font-medium">{account.user.name}</span>
            <span className="text-[11px] text-muted-foreground">{account.user.email}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
