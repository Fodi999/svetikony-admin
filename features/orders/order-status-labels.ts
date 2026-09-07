import type { OrderStatus } from "@/types/entities";

/** The authoritative 8 values and their Ukrainian labels — see
 * types/entities.ts's OrderStatus doc comment for how the value set
 * itself was verified against svet-ikony. Labels as given for Phase
 * 2B-5B. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Нове",
  contacted: "Зв'язалися",
  confirmed: "Підтверджено",
  in_production: "У виробництві",
  ready: "Готове",
  shipped: "Відправлено",
  completed: "Виконано",
  cancelled: "Скасовано",
};

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = (
  Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][]
).map(([value, label]) => ({ value, label }));

/** The normal forward workflow, confirmed with you directly (not
 * invented) — `completed` and `cancelled` have no entry: both are
 * terminal for the purposes of the UI's one-click "next step" button
 * (the backend itself enforces no such thing — see the Phase 2B-5A
 * report's STATUS TRANSITION MODEL section; this map only drives which
 * single quick-action button appears, the full dropdown below it can
 * still reach any of the 8 values). */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "contacted",
  contacted: "confirmed",
  confirmed: "in_production",
  in_production: "ready",
  ready: "shipped",
  shipped: "completed",
};

/** Statuses a dedicated "Cancel" quick action makes sense for — every
 * non-terminal status. Not shown for `completed` (cancelling a finished
 * order isn't a one-click quick action — use the full dropdown, which
 * still carries the terminal-reopen confirmation) or for `cancelled`
 * itself (already cancelled). */
export function isCancellable(status: OrderStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}

/** Terminal, by convention only — the backend does not enforce this (see
 * the Phase 2B-5A report). Used purely to decide when the UI must show a
 * reopen confirmation dialog for a dropdown-driven change. */
export function isTerminal(status: OrderStatus): boolean {
  return status === "completed" || status === "cancelled";
}
