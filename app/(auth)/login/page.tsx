"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Church } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm, type FieldError, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError as FieldErrorMessage, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { getPostLoginPath } from "@/lib/constants/navigation";
import { messages } from "@/lib/i18n";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth.schema";

/**
 * PHASE LOGIN AUTOFILL FIX: email/password use RHF's `register()` (an
 * uncontrolled, ref-based binding) instead of the shared `TextField`'s
 * `Controller` (a fully controlled binding, doubly so once base-ui's own
 * `FieldControl` -- see components/ui/input.tsx -- adds its own internal
 * `useControlled` layer on top). A controlled input only reflects what the
 * browser paints into the DOM once a change/input event fires and is
 * received by React; browser/password-manager autofill frequently sets the
 * native input's value without reliably firing that event, so the
 * Controller-bound value silently stayed at `defaultValues` ("") while the
 * field visually looked filled -- Zod then validated the empty string,
 * producing "Некоректний email"/"Мінімум 4 символи" even though the
 * on-screen fields were filled. `register()` never depends on that event:
 * RHF reads the live DOM value straight from the input's own ref at submit
 * time, which is exactly what autofill (or a password manager) already put
 * there, regardless of whether any event fired.
 *
 * Deliberately NOT a change to TextField/Controller itself -- every other
 * form in the app keeps using that shared, controlled pattern unchanged.
 * This is a login-page-only, minimal fix. LoginField below is a local,
 * unexported helper (not a new shared component) purely to avoid repeating
 * the same 2 fields' markup twice.
 */
function LoginField({
  form,
  name,
  label,
  type,
  placeholder,
  autoComplete,
}: {
  form: UseFormReturn<LoginFormValues>;
  name: keyof LoginFormValues;
  label: string;
  type: string;
  placeholder: string;
  autoComplete: string;
}) {
  const error = form.formState.errors[name];
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} type={type} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={!!error} {...form.register(name)} />
      <FieldErrorMessage errors={error ? [error as FieldError] : undefined} />
    </Field>
  );
}

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

  /**
   * PHASE LOGIN AUTOFILL FIX: register()'s own uncontrolled binding is
   * necessary but not sufficient on its own -- confirmed empirically
   * (see the phase report) that react-hook-form v7 still validates against
   * its own internal value snapshot, not a live read of the DOM, so a field
   * whose value was set without ever firing an input/change event (the
   * real-world autofill/password-manager case this phase targets) would
   * still validate against a stale "" even with register(). This re-syncs
   * that snapshot from the actual native form controls -- which always
   * reflect reality regardless of whether any event fired -- immediately
   * before RHF's own handleSubmit/Zod validation runs.
   */
  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    for (const name of ["email", "password"] as const) {
      const input = event.currentTarget.elements.namedItem(name);
      if (input instanceof HTMLInputElement) form.setValue(name, input.value, { shouldValidate: false });
    }
    return form.handleSubmit(onSubmit)(event);
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

          <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
            <LoginField form={form} name="email" label="Email" type="email" placeholder="admin@svetikony.com" autoComplete="username" />
            <LoginField form={form} name="password" label="Пароль" type="password" placeholder="••••••••" autoComplete="current-password" />
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
