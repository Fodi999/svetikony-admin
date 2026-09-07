"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Church } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/text-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { getPostLoginPath } from "@/lib/constants/navigation";
import { messages } from "@/lib/i18n";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth.schema";

/**
 * `process.env.NODE_ENV !== "production"` is a compile-time constant after
 * Next's build-time inlining, so in a production build this whole
 * expression collapses to `null` and the `import()` below is never
 * reachable — the dev-only panel's chunk (and its mockAccounts/plaintext-
 * demo-password data) is not merely unrendered but never emitted into the
 * build output at all. See features/auth/dev-test-accounts-panel.tsx's own
 * doc comment for why this needed a real module boundary, not just a
 * runtime JSX guard around an inline component.
 */
const DevTestAccountsPanel =
  process.env.NODE_ENV !== "production" ? dynamic(() => import("@/features/auth/dev-test-accounts-panel")) : null;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const { login, status, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const expired = searchParams.get("expired") === "1";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (status === "authenticated" && user) router.replace(getPostLoginPath(user.role));
  }, [status, user, router]);

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    try {
      const loggedInUser = await login(values);
      toast.success("Вхід виконано успішно");
      router.replace(getPostLoginPath(loggedInUser.role));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не вдалося увійти");
    }
  }

  function fillAccount(email: string, password: string) {
    form.setValue("email", email);
    form.setValue("password", password);
    setSubmitError(null);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Church className="size-6 text-primary" aria-hidden />
        Світ Ікони — Адмінка
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Вхід у систему</CardTitle>
          <CardDescription>Введіть email та пароль вашого облікового запису.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {expired ? (
            <Alert variant="destructive">
              <AlertTitle>{messages.states.unauthorizedTitle}</AlertTitle>
              <AlertDescription>Увійдіть, будь ласка, ще раз.</AlertDescription>
            </Alert>
          ) : null}
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Помилка входу</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TextField control={form.control} name="email" label="Email" type="email" placeholder="admin@svetikony.com" />
            <TextField control={form.control} name="password" label="Пароль" type="password" placeholder="••••••••" />
            <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Вхід…" : messages.actions.login}
            </Button>
          </form>

          {DevTestAccountsPanel ? <DevTestAccountsPanel onFill={fillAccount} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
