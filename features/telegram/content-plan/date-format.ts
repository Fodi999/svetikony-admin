/** Ukrainian genitive month names -- "20 серпня" ("20th of August"), not
 * the nominative "серпень" -- used for both the day-cell's small "ст.ст."
 * line and the drawer header's old-style date. */
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

function parseIso(dateIso: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateIso.split("-").map(Number);
  return { year, month, day };
}

/** '2026-09-02' -> '2 вересня' (no year -- for the compact day-cell line). */
export function formatShortUaDate(dateIso: string): string {
  const { month, day } = parseIso(dateIso);
  return `${day} ${GENITIVE_MONTHS[month - 1]}`;
}

/** '2026-09-02' -> '2 вересня 2026' (for the drawer header). */
export function formatFullUaDate(dateIso: string): string {
  const { year, month, day } = parseIso(dateIso);
  return `${day} ${GENITIVE_MONTHS[month - 1]} ${year}`;
}
