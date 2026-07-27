"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Church } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { TextField } from "@/components/forms/text-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { messages } from "@/lib/i18n";
import { mockAccounts } from "@/lib/mock-data/users";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth.schema";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const { login, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const expired = searchParams.get("expired") === "1";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    try {
      await login(values);
      toast.success("Вхід виконано успішно");
      router.replace("/");
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
          <CardDescription>Stage 1: мок-автентифікація, без реального бекенду.</CardDescription>
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

          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">Тестові облікові записи (Stage 1):</p>
            <div className="grid grid-cols-2 gap-2">
              {mockAccounts.map((account) => (
                <Button
                  key={account.user.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto flex-col items-start gap-0 py-2 text-left"
                  onClick={() => fillAccount(account.user.email, account.password)}
                >
                  <span className="text-xs font-medium">{account.user.name}</span>
                  <span className="text-[11px] text-muted-foreground">{account.user.email}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
