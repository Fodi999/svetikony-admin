"use client";

import { BookOpenText, CalendarPlus, ImagePlus, NotebookPen, PackagePlus, ShoppingBag } from "lucide-react";
import { GuardedLink } from "@/components/layout/guarded-link";
import { useAuth } from "@/lib/auth/auth-context";

const ACTIONS = [
  { href: "/calendar/new", label: "Календарний день", icon: CalendarPlus, area: "content" as const },
  { href: "/icons/new", label: "Ікона", icon: ImagePlus, area: "content" as const },
  { href: "/prayers/new", label: "Молитва", icon: NotebookPen, area: "content" as const },
  { href: "/articles/new", label: "Стаття", icon: BookOpenText, area: "content" as const },
  { href: "/catalog/products/new", label: "Товар", icon: PackagePlus, area: "catalog" as const },
  { href: "/orders", label: "Замовлення", icon: ShoppingBag, area: "orders" as const },
];

export function QuickActions() {
  const { canView } = useAuth();
  const actions = ACTIONS.filter((action) => canView(action.area));

  if (actions.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
      {actions.map((action) => (
        <GuardedLink
          key={action.href}
          href={action.href}
          className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center text-xs font-medium hover:bg-accent"
        >
          <action.icon className="size-5" aria-hidden />
          {action.label}
        </GuardedLink>
      ))}
    </div>
  );
}
