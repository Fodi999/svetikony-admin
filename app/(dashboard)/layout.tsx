"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { UnsavedChangesProvider } from "@/components/feedback/unsaved-changes-context";
import { useAuth } from "@/lib/auth/auth-context";
import { messages } from "@/lib/i18n";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "expired") router.replace("/login?expired=1");
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated" || status === "expired") {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        {messages.states.loading}
      </div>
    );
  }

  return (
    <UnsavedChangesProvider>
      <AppShell>{children}</AppShell>
    </UnsavedChangesProvider>
  );
}
