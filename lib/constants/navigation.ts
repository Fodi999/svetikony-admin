import {
  BookOpenText,
  CalendarDays,
  Church,
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
import type { PermissionArea } from "@/lib/auth/permissions";

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
  { href: "/catalog/categories", label: messages.nav.categories, icon: Package, area: "catalog" },
  { href: "/catalog/products", label: messages.nav.products, icon: Package, area: "catalog" },
  { href: "/media", label: messages.nav.media, icon: Images, area: "media" },
  { href: "/telegram", label: messages.nav.telegram, icon: Send, area: "telegram" },
  { href: "/settings", label: messages.nav.settings, icon: Settings, area: "settings" },
];

/** Max 5 slots on mobile — the 5th is always "More". Kept intentionally short per the mobile-first spec. */
export const MOBILE_PRIMARY_HREFS = ["/", "/orders", "/calendar", "/icons"];
