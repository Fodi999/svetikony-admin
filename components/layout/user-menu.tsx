"use client";

import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu() {
  const { user, logout, canView } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${user.name}, меню акаунта`}
        render={<Button variant="ghost" className="h-11 gap-2 px-2" />}
      >
        <Avatar className="size-7">
          <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium md:inline">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
            <span className="mt-1 text-xs font-normal text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {canView("settings") ? (
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="size-4" />
            Налаштування
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await logout();
            toast.success("Ви вийшли з системи");
            router.push("/login");
          }}
        >
          <LogOut className="size-4" />
          Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
