/**
 * Phase 2B-5B: the only place integer cents (the domain model's real,
 * persisted unit — matches svet-ikony's total_price_cents/
 * price_cents_snapshot columns exactly) get turned into a display string.
 * Never store or pass around a divided/floating value anywhere else —
 * see types/entities.ts's Order doc comment.
 *
 * `Intl.NumberFormat`'s `currency` option requires a valid ISO 4217 code;
 * a real order's `currency` field is Worker-supplied free text (defaults
 * to 'UAH' at creation, but nothing guarantees it stays a valid code
 * forever), so this falls back to a plain "amount code" string rather
 * than throwing if formatting fails.
 */
export function formatCents(cents: number, currency: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("uk-UA", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`.trim();
  }
}
