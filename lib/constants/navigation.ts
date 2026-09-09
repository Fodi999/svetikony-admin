import {
  BookOpenText,
  CalendarDays,
  Church,
  Globe,
  Images,
  LayoutDashboard,
  LibraryBig,
  NotebookText,
  Package,
  Send,
  Settings,
  ShoppingBag,
  SquareLibrary,
  Users,
  type LucideIcon,
} from "lucide-react";
import { messages } from "@/lib/i18n";
import { canView, type PermissionArea } from "@/lib/auth/permissions";
import type { Role } from "@/types/entities";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  area: PermissionArea;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: messages.nav.dashboard, icon: LayoutDashboard, area: "content" },
  { href: "/orders", label: messages.nav.orders, icon: ShoppingBag, area: "orders" },
  { href: "/calendar", label: messages.nav.calendar, icon: CalendarDays, area: "content" },
  { href: "/icons", label: messages.nav.icons, icon: Images, area: "content" },
  { href: "/prayers", label: messages.nav.prayers, icon: NotebookText, area: "content" },
  { href: "/saints", label: messages.nav.saints, icon: Users, area: "content" },
  { href: "/gospel", label: messages.nav.gospel, icon: BookOpenText, area: "content" },
  { href: "/articles", label: messages.nav.articles, icon: SquareLibrary, area: "content" },
  { href: "/alphabet", label: messages.nav.alphabet, icon: LibraryBig, area: "content" },
  { href: "/church-info", label: messages.nav.churchInfo, icon: Church, area: "content" },
  { href: "/visualizer", label: messages.nav.visualizer, icon: Globe, area: "content" },
  { href: "/catalog/categories", label: messages.nav.categories, icon: Package, area: "catalog" },
  { href: "/catalog/products", label: messages.nav.products, icon: Package, area: "catalog" },
  { href: "/media", label: messages.nav.media, icon: Images, area: "media" },
  { href: "/telegram", label: messages.nav.telegram, icon: Send, area: "telegram" },
  { href: "/settings", label: messages.nav.settings, icon: Settings, area: "settings" },
];

/** Max 5 slots on mobile — the 5th is always "More". Kept intentionally short per the mobile-first spec. */
export const MOBILE_PRIMARY_HREFS = ["/", "/orders", "/calendar", "/icons"];

/**
 * Phase 2B-6.1: where to send a role right after login. Reuses the same
 * canView() gate the nav itself already filters by (desktop-sidebar.tsx,
 * global-search.tsx, mobile-bottom-nav.tsx) rather than a separate
 * role-to-path table -- "the first nav item this role can actually see, in
 * NAV_ITEMS' own order" is already a real, existing concept, just never
 * applied to the post-login redirect before.
 *
 * Dashboard ("/") is area="content", so order_manager (content: none, see
 * lib/auth/permissions.ts) skips it and lands on the next item it can view
 * -- orders ("/", area="orders", which order_manager has edit on) -- without
 * widening order_manager's grants just to make Dashboard reachable.
 * super_admin/editor/viewer all have content access, so they keep landing
 * on Dashboard exactly as before.
 *
 * Falls back to /no-access only for a hypothetical role with zero viewable
 * areas -- not reachable by any of the 4 current roles (every one has at
 * least a `view` grant somewhere), kept as a defensive floor rather than
 * an unreachable assumption.
 */
export function getPostLoginPath(role: Role): string {
  return NAV_ITEMS.find((item) => canView(role, item.area))?.href ?? "/no-access";
}
