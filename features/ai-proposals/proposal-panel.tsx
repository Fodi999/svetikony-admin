"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { resolveMediaPreviewUrl } from "@/lib/media/resolve-preview-url";
import { proposalMessages } from "@/lib/i18n/ai-proposals";
export type Proposal = {
  id: string;
  target_type: string;
  target_id: string;
  status: "pending" | "applied" | "rejected" | "stale";
  created_at: string;
  before: Record<string, unknown>;
  patch: Record<string, unknown>;
  current?: Record<string, unknown>;
  reason: string;
};
export async function proposalRequest(path = "", body?: unknown) {
  const r = await fetch("/api/bff/ai-proposals" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
function FieldValue({ value, image, alt }: { value: unknown; image: boolean; alt: string }) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2);
  const safe =
    typeof value === "string" && (/^https:\/\//.test(value) || /^\/?media\//.test(value));
  return (
    <div className="min-w-0 space-y-2">
      {image && safe ? (
        <img
          src={resolveMediaPreviewUrl(String(value))}
          alt={alt}
          referrerPolicy="no-referrer"
          className="max-h-48 rounded object-contain"
        />
      ) : null}
      <pre className="max-h-72 overflow-auto text-sm break-words whitespace-pre-wrap">
        {text || "—"}
      </pre>
    </div>
  );
}
export function ProposalPanel({
  targetId,
  onApplied,
  list = false,
}: {
  targetId?: string;
  onApplied?: () => Promise<unknown>;
  list?: boolean;
}) {
  const [locale, setLocale] = useState<keyof typeof proposalMessages>("uk"),
    [selected, setSelected] = useState<string | null>(null),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [status, setStatus] = useState("pending"),
    [page, setPage] = useState(0);
  const t = proposalMessages[locale],
    qc = useQueryClient();
  const query = useQuery<Proposal[]>({
    queryKey: ["ai-proposals", targetId, status, page],
    queryFn: () =>
      proposalRequest(
        "?" +
          new URLSearchParams({
            ...(targetId ? { targetId } : {}),
            status,
            offset: String(page * 100),
          }),
      ),
  });
  const detail = useQuery<Proposal>({
    queryKey: ["ai-proposal", selected],
    queryFn: () => proposalRequest("/" + selected),
    enabled: !!selected,
  });
  const p = detail.data;
  async function action(kind: "apply" | "reject") {
    if (!p || busy) return;
    setBusy(true);
    setError(false);
    try {
      await proposalRequest("/" + p.id + "/" + kind, { confirmation: `APPLY ${p.id}` });
      if (kind === "apply") await onApplied?.();
      await qc.invalidateQueries({ queryKey: ["calendarDays"] });
      setSelected(null);
    } catch {
      setError(true);
    } finally {
      await qc.invalidateQueries({ queryKey: ["ai-proposals"] });
      await qc.invalidateQueries({ queryKey: ["ai-proposal"] });
      setBusy(false);
      setConfirm(false);
    }
  }
  return (
    <section className="bg-card m-4 space-y-4 rounded-lg border border-amber-500/50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">{list ? t.list : t.title}</h2>
        <select
          aria-label="Language"
          value={locale}
          onChange={(e) => setLocale(e.target.value as keyof typeof proposalMessages)}
        >
          {(["uk", "ru", "en"] as const).map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setError(false);
            void query.refetch();
            if (selected) void detail.refetch();
          }}
        >
          {t.refresh}
        </Button>
      </div>
      {list ? (
        <select
          aria-label={t.status}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">{t.all}</option>
          {(["pending", "applied", "rejected", "stale"] as const).map((s) => (
            <option value={s} key={s}>
              {t[s]}
            </option>
          ))}
        </select>
      ) : null}
      {error || query.isError || detail.isError ? <p role="alert">{t.error}</p> : null}
      {query.isLoading ? <p>…</p> : query.data?.length === 0 ? <p>{t.empty}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[t.date, t.section, t.record, t.fields, t.created, t.status, ""].map((h, i) => (
                <th className="p-2" key={i}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {query.data?.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{String(row.before.dateNewStyle ?? "—")}</td>
                <td>{row.target_type}</td>
                <td>{String(row.before.title ?? row.before.name ?? row.target_id)}</td>
                <td>{Object.keys(row.patch).join(", ")}</td>
                <td>{row.created_at}</td>
                <td>{t[row.status]}</td>
                <td>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelected(row.id);
                      setError(false);
                    }}
                  >
                    {t.review}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={!page} onClick={() => setPage((x) => x - 1)}>
          {t.previous}
        </Button>
        <Button
          variant="outline"
          disabled={(query.data?.length ?? 0) < 100}
          onClick={() => setPage((x) => x + 1)}
        >
          {t.next}
        </Button>
      </div>
      {p ? (
        <article className="space-y-4 border-t pt-4">
          <h3>
            {t.title} · {t[p.status]}
          </h3>
          <p className="text-sm">{p.reason}</p>
          {Object.entries(p.patch).map(([field, v]) => (
            <div key={field} className="space-y-2">
              <h4 className="font-semibold">{field}</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded border p-3">
                  <h5>{t.current}</h5>
                  <FieldValue
                    value={(p.current ?? p.before)[field]}
                    image={field === "imageUrl"}
                    alt={t.current + " " + t.image}
                  />
                </div>
                <div className="rounded border border-amber-500/50 p-3">
                  <h5>{t.proposed}</h5>
                  <FieldValue
                    value={v}
                    image={field === "imageUrl"}
                    alt={t.proposed + " " + t.image}
                  />
                </div>
              </div>
            </div>
          ))}
          {p.status === "pending" ? (
            <div className="flex gap-2">
              <Button disabled={busy || detail.isFetching} onClick={() => setConfirm(true)}>
                {t.apply}
              </Button>
              <Button disabled={busy} variant="outline" onClick={() => void action("reject")}>
                {t.reject}
              </Button>
            </div>
          ) : null}
        </article>
      ) : null}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={(p?.current ?? p?.before)?.status === "published" ? t.warning : t.confirm}
        description={t.confirm}
        confirmLabel={t.apply}
        cancelLabel={t.cancel}
        onConfirm={() => void action("apply")}
      />
    </section>
  );
}
