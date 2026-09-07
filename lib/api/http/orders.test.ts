import { afterEach, describe, expect, it, vi } from "vitest";
import { ordersHttpResource } from "./orders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from "@/features/orders/order-status-labels";
import { orderStatusSchema } from "@/lib/validation/order.schema";
import type { OrderStatus } from "@/types/entities";

const ALL_8_STATUSES: OrderStatus[] = ["new", "contacted", "confirmed", "in_production", "ready", "shipped", "completed", "cancelled"];

function dto(status: string) {
  return {
    id: "order-1",
    orderNumber: "IK-000001",
    status,
    isRead: false,
    customerName: "Тест",
    contactMethod: "phone",
    contactValue: "+380000000000",
    country: "",
    city: "",
    iconId: null,
    iconTitleSnapshot: "",
    iconSlugSnapshot: "",
    primaryProductId: null,
    primaryProductNameSnapshot: "",
    primaryProductSlugSnapshot: "",
    primaryProductPriceCentsSnapshot: 0,
    primaryProductPhotoSnapshot: "",
    items: [],
    totalPriceCents: 1000,
    currency: "UAH",
    comment: "",
    adminNote: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

/**
 * Phase 2B-5B, item 16: proves every one of the 8 authoritative status
 * values (see types/entities.ts's OrderStatus doc comment for how the
 * set itself was verified against svet-ikony) maps correctly all the way
 * from a Worker-shaped DTO through the real ordersHttpResource.get() to
 * the admin domain type, AND that `in_progress` — the old admin-only
 * value with no backend basis — no longer appears in any of the
 * production-facing option lists.
 */
describe("Order status contract — all 8 authoritative values", () => {
  it.each(ALL_8_STATUSES)("backend status '%s' round-trips through ordersHttpResource.get() unchanged", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto(status))));
    const order = await ordersHttpResource.get("order-1");
    expect(order.status).toBe(status);
  });

  it("orderStatusSchema accepts exactly the 8 real values", () => {
    for (const status of ALL_8_STATUSES) {
      expect(orderStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("ORDER_STATUS_OPTIONS / ORDER_STATUS_LABELS contain exactly the 8 real values, nothing more", () => {
    expect(new Set(ORDER_STATUS_OPTIONS.map((o) => o.value))).toEqual(new Set(ALL_8_STATUSES));
    expect(new Set(Object.keys(ORDER_STATUS_LABELS))).toEqual(new Set(ALL_8_STATUSES));
  });

  it("'in_progress' (the old admin-only value, no backend basis) is rejected by the schema and absent from every option list", () => {
    expect(orderStatusSchema.safeParse("in_progress").success).toBe(false);
    // Cast to string for the comparison itself: OrderStatus's type no
    // longer includes "in_progress" at all (a compile-time proof on its
    // own — TS correctly flags a direct `=== "in_progress"` comparison
    // against OrderStatus as having no overlap), so this only re-checks
    // the same fact at the runtime/string level for the option list.
    expect((ORDER_STATUS_OPTIONS.map((o) => o.value) as string[]).includes("in_progress")).toBe(false);
    expect(Object.keys(ORDER_STATUS_LABELS)).not.toContain("in_progress");
  });

  it("a genuinely unrecognized status value from the Worker falls back safely to 'new' rather than crashing (defense in depth -- the real backend's own CHECK constraint should make this unreachable in practice)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(dto("in_progress"))));
    const order = await ordersHttpResource.get("order-1");
    expect(order.status).toBe("new");
  });
});
