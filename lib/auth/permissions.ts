import type { Role } from "@/types/entities";

export type PermissionArea = "content" | "catalog" | "orders" | "settings" | "media";
export type AccessLevel = "none" | "view" | "edit";

const MATRIX: Record<Role, Record<PermissionArea, AccessLevel>> = {
  super_admin: { content: "edit", catalog: "edit", orders: "edit", settings: "edit", media: "edit" },
  editor: { content: "edit", catalog: "edit", orders: "view", settings: "none", media: "edit" },
  order_manager: { content: "none", catalog: "edit", orders: "edit", settings: "none", media: "edit" },
  viewer: { content: "view", catalog: "view", orders: "view", settings: "none", media: "view" },
};

export function accessLevel(role: Role, area: PermissionArea): AccessLevel {
  return MATRIX[role][area];
}

export function canView(role: Role, area: PermissionArea): boolean {
  return accessLevel(role, area) !== "none";
}

export function canEdit(role: Role, area: PermissionArea): boolean {
  return accessLevel(role, area) === "edit";
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Супер-адміністратор",
  editor: "Редактор",
  order_manager: "Менеджер замовлень",
  viewer: "Спостерігач",
};
