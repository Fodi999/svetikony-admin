import type { AccessLevel, PermissionArea } from "@/lib/auth/permissions";

/**
 * The ONE place area/level values are ever written for BFF resource
 * routes (Phase 1C). Every `withAuth(...)` call site references a member
 * of this object — never an inline `{ area: "...", level: "..." }`
 * literal — so a route's policy and the value the manifest test checks
 * are structurally the same reference, not two independently-authored
 * things that could quietly drift apart. See
 * app/api/bff/_lib/route-manifest.test.ts, which parses every route
 * file's AST and asserts each exported HTTP handler's withAuth() call
 * points at a `POLICY.*` member (not a literal), then separately
 * validates this object's own contents against the real permission
 * matrix (lib/auth/permissions.ts).
 *
 * Originally exactly 8 entries: the 4 real areas resource routes fell
 * into (content/catalog/media/telegram) × the 2 real levels (view/edit) —
 * no route needed a policy outside that 4x2 grid, checked every handler's
 * actual semantics during the Phase 1C retrofit, not just applied
 * GET=view/POST=edit blindly. Phase 2B-5B added `orders` as a genuinely
 * new area (unlike Articles/Gospel/Church-Info, which all reused
 * `content`): Orders is a real, distinct area in the permission matrix
 * with its own role grants (super_admin/order_manager = edit,
 * editor/viewer = none — a real least-privilege restriction over customer
 * PII, not the `content` area's broader viewer/editor access).
 */
export const POLICY = {
  aiAccess: { area: "settings", level: "edit" },
  contentView: { area: "content", level: "view" },
  contentEdit: { area: "content", level: "edit" },
  catalogView: { area: "catalog", level: "view" },
  catalogEdit: { area: "catalog", level: "edit" },
  ordersView: { area: "orders", level: "view" },
  ordersEdit: { area: "orders", level: "edit" },
  mediaView: { area: "media", level: "view" },
  mediaEdit: { area: "media", level: "edit" },
  telegramView: { area: "telegram", level: "view" },
  telegramEdit: { area: "telegram", level: "edit" },
} as const satisfies Record<string, { area: PermissionArea; level: AccessLevel }>;
