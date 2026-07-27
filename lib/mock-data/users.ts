import type { AuthUser } from "@/types/entities";

export interface MockAccount {
  user: AuthUser;
  /** Stage-1 only: plain mock password, never used once a real auth flow exists. */
  password: string;
}

export const mockAccounts: MockAccount[] = [
  {
    user: {
      id: "user-super-admin",
      name: "Дмитро Адміністратор",
      email: "admin@svetikony.com",
      role: "super_admin",
    },
    password: "admin123",
  },
  {
    user: {
      id: "user-editor",
      name: "Марія Редакторка",
      email: "editor@svetikony.com",
      role: "editor",
    },
    password: "editor123",
  },
  {
    user: {
      id: "user-order-manager",
      name: "Іван Менеджер",
      email: "orders@svetikony.com",
      role: "order_manager",
    },
    password: "orders123",
  },
  {
    user: {
      id: "user-viewer",
      name: "Оксана Спостерігачка",
      email: "viewer@svetikony.com",
      role: "viewer",
    },
    password: "viewer123",
  },
];
