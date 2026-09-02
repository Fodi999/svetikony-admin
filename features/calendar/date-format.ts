/** Ukrainian genitive month names -- "20 серпня" ("20th of August"), not
 * the nominative "серпень". Small local copy of the same convention as
 * features/telegram/content-plan/date-format.ts (kept feature-local
 * rather than a cross-feature import -- pure UI text formatting, not
 * domain state, and small enough that duplicating it is cheaper than
 * coupling this feature to Telegram's). */
const GENITIVE_MONTHS = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
];

function parseIso(dateIso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** '2026-09-02' -> '2 вересня' (no year -- for the compact day-cell line). */
export function formatShortUaDate(dateIso: string): string | null {
  const parsed = parseIso(dateIso);
  if (!parsed) return null;
  return `${parsed.day} ${GENITIVE_MONTHS[parsed.month - 1]}`;
}

/** '2026-09-02' -> '2 вересня 2026' (for headings). */
export function formatFullUaDate(dateIso: string): string | null {
  const parsed = parseIso(dateIso);
  if (!parsed) return null;
  return `${parsed.day} ${GENITIVE_MONTHS[parsed.month - 1]} ${parsed.year}`;
}
