import { describe, expect, it } from "vitest";
import { canEdit, canView } from "./permissions";

describe("permissions matrix", () => {
  it("gives super_admin full access everywhere", () => {
    for (const area of ["content", "catalog", "orders", "settings", "media"] as const) {
      expect(canView("super_admin", area)).toBe(true);
      expect(canEdit("super_admin", area)).toBe(true);
    }
  });

  it("blocks editor from settings entirely", () => {
    expect(canView("editor", "settings")).toBe(false);
    expect(canEdit("editor", "settings")).toBe(false);
  });

  it("lets editor edit content and catalog, but has no orders access at all (Phase 2B-5B: orders carries customer PII editor has no business need for)", () => {
    expect(canEdit("editor", "content")).toBe(true);
    expect(canEdit("editor", "catalog")).toBe(true);
    expect(canView("editor", "orders")).toBe(false);
    expect(canEdit("editor", "orders")).toBe(false);
  });

  it("restricts order_manager to orders and catalog, with no content access", () => {
    expect(canEdit("order_manager", "orders")).toBe(true);
    expect(canEdit("order_manager", "catalog")).toBe(true);
    expect(canView("order_manager", "content")).toBe(false);
    expect(canEdit("order_manager", "settings")).toBe(false);
  });

  it("makes viewer read-only for content/catalog/media, but grants no orders access at all (Phase 2B-5B: same PII reasoning as editor)", () => {
    for (const area of ["content", "catalog", "media"] as const) {
      expect(canView("viewer", area)).toBe(true);
      expect(canEdit("viewer", area)).toBe(false);
    }
    expect(canView("viewer", "orders")).toBe(false);
    expect(canView("viewer", "settings")).toBe(false);
  });
});
