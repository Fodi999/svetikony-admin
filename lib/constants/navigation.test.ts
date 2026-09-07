import { describe, expect, it } from "vitest";
import { getPostLoginPath } from "./navigation";
import type { Role } from "@/types/entities";

/**
 * Phase 2B-6.1: proves the actual routing question the phase asked --
 * "where does a role land right after login?" -- not just that
 * canView()/NAV_ITEMS individually work.
 */
describe("getPostLoginPath()", () => {
  it.each<Role>(["super_admin", "editor", "viewer"])("%s lands on Dashboard ('/') -- unchanged from before this phase", (role) => {
    expect(getPostLoginPath(role)).toBe("/");
  });

  it("order_manager (content: none, per lib/auth/permissions.ts) skips Dashboard and lands on /orders, the first area it can actually view", () => {
    expect(getPostLoginPath("order_manager")).toBe("/orders");
  });
});
