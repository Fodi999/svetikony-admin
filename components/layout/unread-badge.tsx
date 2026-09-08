/** Solid red/white numeric pill -- deliberately not the shared `Badge`
 * component's soft-tint `destructive` variant (see badge.tsx), which reads
 * as a status tag, not a notification count. Renders nothing at count <= 0
 * so hidden state costs zero layout (a trailing flex child that just isn't
 * there, not a hidden one). */
export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-white"
      aria-label={`${count} непрочитаних замовлень`}
    >
      {label}
    </span>
  );
}
