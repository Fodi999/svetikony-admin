"use client";

import { ChevronsLeft, ChevronsRight, Church } from "lucide-react";
import { usePathname } from "next/navigation";
import { GuardedLink } from "@/components/layout/guarded-link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { NAV_ITEMS, type NavItem } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";
import { usePersistentToggle } from "@/lib/utils/use-persistent-toggle";

const COLLAPSE_KEY = "svetikony-admin.sidebar-collapsed";

interface Section {
  heading?: string;
  hrefs: string[];
}

const SECTIONS: Section[] = [
  { hrefs: ["/"] },
  {
    heading: "Контент",
    hrefs: [
      "/calendar",
      "/icons",
      "/prayers",
      "/saints",
      "/gospel",
      "/articles",
      "/alphabet",
      "/church-info",
    ],
  },
  { heading: "Каталог", hrefs: ["/catalog/categories", "/catalog/products"] },
  { heading: "Робота", hrefs: ["/orders", "/media"] },
  { heading: "Система", hrefs: ["/settings"] },
];

function NavLink({ item, collapsed, active }: { item: NavItem; collapsed: boolean; active: boolean }) {
  return (
    <GuardedLink
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <item.icon className="size-4.5 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </GuardedLink>
  );
}

export function DesktopSidebar() {
  const pathname = usePathname();
  const { canView } = useAuth();
  const [collapsed, setCollapsed] = usePersistentToggle(COLLAPSE_KEY);

  function toggleCollapsed() {
    setCollapsed(!collapsed);
  }

  const visibleItems = NAV_ITEMS.filter((item) => canView(item.area));
  const visibleHrefs = new Set(visibleItems.map((i) => i.href));
  const byHref = new Map(visibleItems.map((item) => [item.href, item]));

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-18" : "w-64",
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 border-b px-4", collapsed && "justify-center px-0")}>
        <Church className="size-5 shrink-0 text-primary" aria-hidden />
        {!collapsed && <span className="truncate font-semibold">Світ Ікони</span>}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {SECTIONS.map((section, index) => {
          const items = section.hrefs.map((href) => byHref.get(href)).filter((item): item is NavItem => !!item && visibleHrefs.has(item.href));
          if (items.length === 0) return null;
          return (
            <div key={index} className="space-y-1">
              {section.heading && !collapsed ? (
                <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {section.heading}
                </p>
              ) : null}
              {items.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Button variant="ghost" size="icon" className="size-11 w-full" onClick={toggleCollapsed} aria-label="Згорнути/розгорнути меню">
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </Button>
      </div>
    </aside>
  );
}
