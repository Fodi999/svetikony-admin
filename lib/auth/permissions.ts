import type { Role } from "@/types/entities";

export type PermissionArea = "content" | "catalog" | "orders" | "settings" | "media" | "telegram";
export type AccessLevel = "none" | "view" | "edit";

/** `telegram` is super_admin-only for every role: it publishes to the
 * public @svit_ikony channel, a meaningfully bigger blast radius than
 * editing draft content, so it gets the same restriction as `settings`
 * rather than the `content`-area treatment other editorial features get. */
const MATRIX: Record<Role, Record<PermissionArea, AccessLevel>> = {
  super_admin: { content: "edit", catalog: "edit", orders: "edit", settings: "edit", media: "edit", telegram: "edit" },
  editor: { content: "edit", catalog: "edit", orders: "view", settings: "none", media: "edit", telegram: "none" },
  order_manager: { content: "none", catalog: "edit", orders: "edit", settings: "none", media: "edit", telegram: "none" },
  viewer: { content: "view", catalog: "view", orders: "view", settings: "none", media: "view", telegram: "none" },
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
