"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { RequireAccess } from "@/components/layout/require-access";
import { Button } from "@/components/ui/button";
import { aiAccessMessages } from "@/lib/i18n/ai-access";
type Grant = {
  id: string;
  mode: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  lastActivity: string | null;
  status: string;
  connected: boolean;
};
type Activity = {
  id: string;
  created_at: string;
  module: string;
  operation: string;
  target_id: string | null;
  status: string;
};
const modules = [
  "calendar",
  "saints",
  "icons",
  "prayers",
  "articles",
  "gospel",
  "alphabet",
  "seo",
  "media",
  "visualizer",
  "terrain",
  "r2",
] as const;
export default function AiAccess() {
  const [locale, setLocale] = useState<"uk" | "ru" | "en">("uk"),
    [grants, setGrants] = useState<Grant[]>([]),
    [events, setEvents] = useState<Activity[]>([]),
    [mode, setMode] = useState("DRAFT_EDIT"),
    [duration, setDuration] = useState(30),
    [selected, setSelected] = useState<string[]>([
      "calendar",
      "saints",
      "prayers",
      "articles",
      "seo",
    ]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [loaded, setLoaded] = useState(false),
    [codes, setCodes] = useState<Record<string, { pairingCode: string; codeExpiresAt: string }>>(
      {},
    ),
    [copied, setCopied] = useState(false),
    [clock, setClock] = useState(Date.now());
  const lock = useRef(false);
  const t = aiAccessMessages[locale];
  const api = async (path: string, body?: unknown) => {
    const r = await fetch("/api/bff/ai-access/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (!r.ok) throw Error("Request failed");
    return r.json();
  };
  const refresh = useCallback(async () => {
    try {
      const [g, e] = await Promise.all([api("grants"), api("activity")]);
      setGrants(g);
      setEvents(e);
      setLoaded(true);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      setClock(Date.now());
      void refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function action(path: string, body: unknown = {}) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      const r = await api(path, body);
      if (r.pairingCode) {
        const id = r.id ?? path.split("/")[1];
        setCodes((old) => ({ ...old, [id]: r }));
      }
      await refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const format = (s: string) => new Date(s).toLocaleString(locale);
  return (
    <RequireAccess area="settings" requireEdit>
      <main className="mx-auto grid w-full max-w-5xl gap-6 p-4 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t.title}</h1>
            <p className="text-muted-foreground mt-2">{t.description}</p>
          </div>
          <select
            aria-label={t.language}
            className="rounded border p-2"
            value={locale}
            onChange={(e) => setLocale(e.target.value as typeof locale)}
          >
            <option value="uk">UK</option>
            <option value="ru">RU</option>
            <option value="en">EN</option>
          </select>
        </div>
        {error && (
          <p role="alert" className="border-destructive rounded border p-3">
            {t.error}
          </p>
        )}
        <section className="bg-card grid gap-5 rounded-xl border p-5">
          <fieldset className="flex flex-wrap gap-4">
            <legend className="mb-2 font-medium">{t.mode}</legend>
            {[
              ["READ_ONLY", t.readOnly],
              ["DRAFT_EDIT", t.draftEdit],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <p className="text-muted-foreground text-sm">{t.publish}</p>
          <fieldset>
            <legend className="mb-3 font-medium">{t.modules}</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {modules.map((m) => (
                <label key={m} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(m)}
                    onChange={(e) =>
                      setSelected((old) =>
                        e.target.checked ? [...old, m] : old.filter((x) => x !== m),
                      )
                    }
                  />
                  {t[m]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-3">
            {t.duration}
            <select
              className="rounded border p-2"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {[15, 30, 60, 120].map((n) => (
                <option key={n} value={n}>
                  {n} {t.minutes}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={busy || !selected.length}
            onClick={() => action("grants", { mode, modules: selected, durationMinutes: duration })}
          >
            {t.allow}
          </Button>
        </section>
        {!loaded ? (
          <p>{t.loading}</p>
        ) : !grants.length ? (
          <p>{t.empty}</p>
        ) : (
          grants.map((g) => {
            const active = g.status === "active" && Date.parse(g.expiresAt) > clock;
            const code = codes[g.id];
            return (
              <section key={g.id} className="bg-card grid gap-3 rounded-xl border p-5">
                <h2 className="font-semibold">
                  {!active
                    ? g.status === "revoked"
                      ? t.revoked
                      : t.expired
                    : g.connected
                      ? t.connected
                      : t.waiting}
                </h2>
                <p>
                  {t.mode}: {g.mode === "READ_ONLY" ? t.readOnly : t.draftEdit}
                </p>
                <p>
                  {t.expires}: {format(g.expiresAt)}
                </p>
                {g.lastActivity && (
                  <p>
                    {t.lastActivity}: {format(g.lastActivity)}
                  </p>
                )}
                <p className="text-muted-foreground text-sm">
                  {t.scope}:{" "}
                  {modules
                    .filter((m) => g.scopes.includes(m + ".read"))
                    .map((m) => t[m])
                    .join(", ")}
                </p>
                {active && !g.connected && code && Date.parse(code.codeExpiresAt) > clock && (
                  <div className="bg-muted grid gap-2 rounded-lg p-4">
                    <p>{t.code}</p>
                    <strong className="text-2xl tracking-widest">{code.pairingCode}</strong>
                    <p>
                      {t.expires}: {format(code.codeExpiresAt)}
                    </p>
                    <p className="text-sm">{t.pairHelp}</p>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(code.pairingCode);
                          setCopied(true);
                        } catch {
                          setError(true);
                        }
                      }}
                    >
                      {copied ? t.copied : t.copy}
                    </Button>
                  </div>
                )}
                {active && (
                  <div className="flex flex-wrap gap-3">
                    {!g.connected && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => action(`grants/${g.id}/pairing`)}
                      >
                        {t.newCode}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => action(`grants/${g.id}/revoke`)}
                    >
                      {t.revoke}
                    </Button>
                  </div>
                )}
              </section>
            );
          })
        )}
        <section className="grid gap-3 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t.activity}</h2>
            <Button variant="outline" onClick={() => refresh()}>
              {t.refresh}
            </Button>
          </div>
          {!events.length ? (
            <p>{t.noActivity}</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="border-b py-2 text-sm">
                <p>
                  {format(e.created_at)} ·{" "}
                  {modules.includes(e.module as (typeof modules)[number])
                    ? t[e.module as (typeof modules)[number]]
                    : e.module}{" "}
                  · {t[e.operation as "read" | "create" | "update"] ?? e.operation}
                </p>
                <p className="text-muted-foreground break-all">
                  {e.target_id} · {e.status === "success" ? t.success : t.failed}
                </p>
              </div>
            ))
          )}
        </section>
      </main>
    </RequireAccess>
  );
}
