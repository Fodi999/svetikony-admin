"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { GuardedLink } from "@/components/layout/guarded-link";
import { MoreMenuList } from "@/components/layout/more-menu-list";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/auth-context";
import { messages } from "@/lib/i18n";
import { MOBILE_PRIMARY_HREFS, NAV_ITEMS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { canView } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  /** Phase 2B-5B: must filter by permission, not just map the hardcoded
   * href list — Orders is now `none` for editor/viewer (was `view` for
   * everyone before), and this bar previously showed it unconditionally
   * regardless of role. more-menu-list.tsx already excludes every
   * MOBILE_PRIMARY_HREFS item from its own listing unconditionally, so a
   * filtered-out item here doesn't leak into the "More" sheet either —
   * it's simply not shown anywhere for a role without access, matching
   * the sidebar/global-search's existing canView-based filtering. */
  const primaryItems = MOBILE_PRIMARY_HREFS.map((href) => NAV_ITEMS.find((item) => item.href === href))
    .filter((item): item is NonNullable<typeof item> => !!item)
    .filter((item) => canView(item.area));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Основна навігація"
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${primaryItems.length + 1}, minmax(0, 1fr))` }}>
          {primaryItems.map((item) => {
            const active = pathname === item.href;
            return (
              <GuardedLink
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </GuardedLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"
          >
            <Menu className="size-5" aria-hidden />
            {messages.nav.more}
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[80svh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Усі розділи</SheetTitle>
          </SheetHeader>
          <MoreMenuList onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
