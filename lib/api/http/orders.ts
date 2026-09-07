import type { z } from "zod";
import type { BffOrderDto, BffOrderItemDto } from "@/app/api/bff/orders/_contract";
import type { ApiClient, OrderQuery } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { httpGet, httpPut } from "@/lib/api/http/transport";
import { matchesSearch, paginate } from "@/lib/api/mock-utils";
import { orderStatusSchema } from "@/lib/validation/order.schema";
import type { Order, OrderItem, OrderStatus } from "@/types/entities";

function safeEnum<T extends string>(schema: z.ZodType<T>, value: string, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

function toItem(dto: BffOrderItemDto): OrderItem {
  return {
    id: dto.id,
    optionId: dto.optionId ?? undefined,
    optionNameSnapshot: dto.optionNameSnapshot,
    priceCentsSnapshot: dto.priceCentsSnapshot,
    quantity: dto.quantity,
  };
}

/**
 * BFF DTO -> admin entity. Field-for-field with the real backend (see
 * _contract.ts's doc comment) — every snapshot field (icon/product title,
 * slug, price, photo) is carried through unchanged from what the Worker
 * returns, never re-resolved against a current Product/Icon: these are
 * real historical snapshots taken at order-creation time (see the Phase
 * 2B-5B report's ORDER SNAPSHOT DISPLAY section) — replacing them with
 * "live" data would misrepresent what the customer actually ordered and
 * paid for.
 */
function toEntity(dto: BffOrderDto): Order {
  return {
    id: dto.id,
    orderNumber: dto.orderNumber,
    status: safeEnum<OrderStatus>(orderStatusSchema, dto.status, "new"),
    isRead: dto.isRead,
    customerName: dto.customerName,
    contactMethod: dto.contactMethod === "email" ? "email" : "phone",
    contactValue: dto.contactValue,
    country: dto.country || undefined,
    city: dto.city || undefined,
    iconId: dto.iconId ?? undefined,
    iconTitleSnapshot: dto.iconTitleSnapshot || undefined,
    iconSlugSnapshot: dto.iconSlugSnapshot || undefined,
    primaryProductId: dto.primaryProductId ?? undefined,
    primaryProductNameSnapshot: dto.primaryProductNameSnapshot || undefined,
    primaryProductSlugSnapshot: dto.primaryProductSlugSnapshot || undefined,
    primaryProductPriceCentsSnapshot: dto.primaryProductPriceCentsSnapshot || undefined,
    primaryProductPhotoSnapshot: dto.primaryProductPhotoSnapshot || undefined,
    items: dto.items.map(toItem),
    totalPriceCents: dto.totalPriceCents,
    currency: dto.currency,
    comment: dto.comment || undefined,
    adminNote: dto.adminNote || undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

async function list(query?: OrderQuery) {
  const dtos = await httpGet<BffOrderDto[]>(BFF_ENDPOINTS.orders);
  let items = dtos.map(toEntity);
  if (query?.status === "unread") {
    items = items.filter((order) => !order.isRead);
  } else if (query?.status) {
    items = items.filter((order) => order.status === query.status);
  }
  if (query?.dateFrom) items = items.filter((order) => order.createdAt >= query.dateFrom!);
  if (query?.dateTo) items = items.filter((order) => order.createdAt <= query.dateTo!);
  items = items.filter((order) => matchesSearch([order.orderNumber, order.customerName, order.contactValue], query?.search));
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(items, query);
}

async function get(id: string): Promise<Order> {
  const dto = await httpGet<BffOrderDto>(`${BFF_ENDPOINTS.orders}/${encodeURIComponent(id)}`);
  return toEntity(dto);
}

export const ordersHttpResource: ApiClient["orders"] = {
  list,
  get,
  /** Sends only `{status}` — never re-sends adminNote alongside it, so a
   * status change can never accidentally clobber a note edited elsewhere
   * (see the Phase 2B-5B report's UPDATE SEMANTICS section). */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const dto = await httpPut<BffOrderDto>(`${BFF_ENDPOINTS.orders}/${encodeURIComponent(id)}`, { status });
    return toEntity(dto);
  },
  /** Sends only `{adminNote}` — same reasoning in reverse. */
  async updateNote(id: string, adminNote: string): Promise<Order> {
    const dto = await httpPut<BffOrderDto>(`${BFF_ENDPOINTS.orders}/${encodeURIComponent(id)}`, { adminNote });
    return toEntity(dto);
  },
  /** No boolean parameter: the real backend has no mark-unread endpoint,
   * so there is nothing to toggle — see _contract.ts's doc comment. The
   * real route returns 204 (no body); refetch via query invalidation
   * (see order-detail-view.tsx) rather than trusting a mapped response. */
  async markRead(id: string): Promise<Order> {
    await httpPut<void>(`${BFF_ENDPOINTS.orders}/${encodeURIComponent(id)}/read`, undefined);
    return get(id);
  },
};
