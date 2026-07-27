"use client";

import { GuardedLink } from "@/components/layout/guarded-link";
import { useAuth } from "@/lib/auth/auth-context";
import { MOBILE_PRIMARY_HREFS, NAV_ITEMS } from "@/lib/constants/navigation";

export function MoreMenuList({ onNavigate }: { onNavigate?: () => void }) {
  const { canView } = useAuth();
  const items = NAV_ITEMS.filter(
    (item) => !MOBILE_PRIMARY_HREFS.includes(item.href) && canView(item.area),
  );

  return (
    <div className="grid grid-cols-3 gap-3 p-1">
      {items.map((item) => (
        <GuardedLink
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center text-xs font-medium hover:bg-accent"
        >
          <item.icon className="size-5" aria-hidden />
          <span>{item.label}</span>
        </GuardedLink>
      ))}
    </div>
  );
}
