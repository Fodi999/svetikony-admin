"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StateMessage } from "@/components/feedback/state-message";
import { useAuth } from "@/lib/auth/auth-context";
import { getPostLoginPath } from "@/lib/constants/navigation";

/**
 * Phase 3 (Telegram passwordless admin login) landing page. Reached only
 * by tapping the Telegram bot's "🔐 Відкрити адмінку" button, whose URL is
 * `${ADMIN_ORIGIN}/telegram-login#ticket=<raw ticket>` -- a fragment, not a
 * query param, so the raw ticket is never sent in the initial HTTP request
 * and therefore never appears in server/proxy access logs. This page:
 *
 * 1. reads the ticket from location.hash (client-only -- fragments never
 *    reach the server at all, so there is nothing to read server-side)
 * 2. immediately strips it from history via history.replaceState(), before
 *    even attempting the exchange, so it can never resurface via back/
 *    forward navigation or an accidental page reload
 * 3. POSTs it once to the BFF's exchange endpoint (never localStorage/
 *    sessionStorage -- see loginWithTelegramTicket in auth-context.tsx,
 *    which itself only ever holds it in a local variable for the one
 *    fetch call)
 * 4. on success, redirects to the role's normal landing page with no
 *    further clicks; on failure, shows a generic message -- never a stack
 *    trace or API error detail.
 */
export default function TelegramLoginPage() {
  const router = useRouter();
  const { loginWithTelegramTicket } = useAuth();
  const [status, setStatus] = useState<"checking" | "error">("checking");

  useEffect(() => {
    const hash = window.location.hash;
    const match = /^#ticket=(.+)$/.exec(hash);
    const rawTicket = match?.[1];

    // Strip the fragment from the visible URL/history unconditionally,
    // before the exchange even runs -- a failed exchange must not leave
    // the ticket sitting in the address bar or back-stack either.
    window.history.replaceState(null, "", window.location.pathname);

    let cancelled = false;
    void (async () => {
      // Yields past the synchronous effect-commit phase before any
      // setState below -- calling setState synchronously inside an effect
      // body can trigger a cascading extra render (flagged by
      // react-hooks' own lint rule); every branch here, including the
      // no-ticket case, now goes through this same microtask boundary
      // first, never straight from the effect callback itself.
      await Promise.resolve();
      if (cancelled) return;

      if (!rawTicket) {
        setStatus("error");
        return;
      }

      try {
        const ticket = decodeURIComponent(rawTicket);
        const user = await loginWithTelegramTicket(ticket);
        if (cancelled) return;
        router.replace(getPostLoginPath(user.role));
      } catch {
        if (cancelled) return;
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs exactly once, reading the fragment present at mount
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      {status === "checking" ? (
        <p className="text-sm text-muted-foreground">Перевіряємо доступ…</p>
      ) : (
        <StateMessage
          variant="unauthorized"
          title="Посилання недійсне або термін його дії завершився."
          description="Створіть нове через /login."
          action={{ label: "На сторінку входу", onClick: () => router.replace("/login") }}
        />
      )}
    </div>
  );
}
