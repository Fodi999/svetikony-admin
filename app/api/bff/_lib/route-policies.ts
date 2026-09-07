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
 * Exactly 8 entries: the 4 real areas resource routes fall into
 * (content/catalog/media/telegram — no BFF route exists yet for
 * orders/settings, see the Phase 1C report's "temporary mock module
 * status" section) × the 2 real levels (view/edit). No route needed a
 * policy outside this 4x2 grid — checked every handler's actual semantics
 * during the retrofit, not just applied GET=view/POST=edit blindly; see
 * the Phase 1C report's "POLICY MAP" section for the handful of routes
 * that got explicit scrutiny (all AI-generation actions and Telegram
 * content-plan state changes are real writes, not read-like, so they're
 * `edit` even though several are conceptually "generate a preview").
 */
export const POLICY = {
  contentView: { area: "content", level: "view" },
  contentEdit: { area: "content", level: "edit" },
  catalogView: { area: "catalog", level: "view" },
  catalogEdit: { area: "catalog", level: "edit" },
  mediaView: { area: "media", level: "view" },
  mediaEdit: { area: "media", level: "edit" },
  telegramView: { area: "telegram", level: "view" },
  telegramEdit: { area: "telegram", level: "edit" },
} as const satisfies Record<string, { area: PermissionArea; level: AccessLevel }>;
