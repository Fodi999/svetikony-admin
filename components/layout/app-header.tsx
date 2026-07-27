import { Church } from "lucide-react";
import { ConnectionStatus } from "@/components/layout/connection-status";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2 md:hidden">
        <Church className="size-5 text-primary" aria-hidden />
        <span className="font-semibold">Світ Ікони</span>
      </div>

      <div className="hidden flex-1 md:flex">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ConnectionStatus />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
