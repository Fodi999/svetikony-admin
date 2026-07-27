"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { NAV_ITEMS } from "@/lib/constants/navigation";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { canView } = useAuth();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const items = NAV_ITEMS.filter((item) => canView(item.area));

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-11 w-full max-w-sm justify-between text-muted-foreground md:w-64"
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" />
          Пошук…
        </span>
        <CommandShortcut>⌘K</CommandShortcut>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Глобальний пошук"
        description="Перехід між розділами адмін-панелі"
      >
        <CommandInput placeholder="Введіть назву розділу…" />
        <CommandList>
          <CommandEmpty>Нічого не знайдено.</CommandEmpty>
          <CommandGroup heading="Розділи">
            {items.map((item) => (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
              >
                <item.icon className="size-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
