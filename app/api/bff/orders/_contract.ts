/**
 * The stable BFF contract for Orders. Worker DTO -> BFF DTO here is pure
 * field whitelisting — no semantic decisions (label mapping, cents-to-
 * display formatting). Those belong in lib/api/http/orders.ts's
 * toEntity()/toPayload().
 *
 * Orders carry real customer PII — see the Phase 2B-5A/2B-5B reports'
 * PII/ROLE ACCESS sections. Every route here is POLICY.ordersView/
 * ordersEdit-gated, a genuinely restricted area (super_admin/
 * order_manager only — editor and viewer get 403, never reaching the
 * upstream call at all, let alone this mapping code).
 */

/** Mirrors svet-ikony's lib/d1/repositories/orders.ts's
 * ChurchIconOrderDto exactly (Phase 2B-5B). Do not add fields here that
 * aren't in that type — in particular, `client_ip` is a real DB column
 * but is deliberately never selected into this DTO by the Worker itself
 * (verified directly), so it never reaches here to begin with. */
export interface WorkerIconOrderItemDto {
  id: string;
  orderId: string;
  optionId: string | null;
  optionNameSnapshot: string;
  priceCentsSnapshot: number;
  quantity: number;
}

export interface WorkerIconOrderDto {
  id: string;
  siteId: string;
  isGlobal: boolean;
  orderNumber: string;
  iconId: string | null;
  iconTitleSnapshot: string;
  iconSlugSnapshot: string;
  primaryProductId: string | null;
  primaryProductNameSnapshot: string;
  primaryProductSlugSnapshot: string;
  primaryProductPriceCentsSnapshot: number;
  primaryProductPhotoSnapshot: string;
  customerName: string;
  contactMethod: string;
  contactValue: string;
  preferredContactChannel: string;
  country: string;
  city: string;
  consecrationRequested: boolean;
  comment: string;
  consentGiven: boolean;
  status: string;
  adminNote: string;
  totalPriceCents: number;
  currency: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  items: WorkerIconOrderItemDto[];
}

/** Dropped: `siteId`, `isGlobal` (internal, no admin use), `orderId` on
 * each item (redundant — always the same order), `preferredContactChannel`/
 * `consecrationRequested`/`consentGiven` (real fields, but the admin UI
 * has never edited or displayed them — same "not new scope" treatment as
 * Articles' calendarDayId; flagged in the phase report, not silently
 * dropped from a working feature). */
export interface BffOrderItemDto {
  id: string;
  optionId: string | null;
  optionNameSnapshot: string;
  priceCentsSnapshot: number;
  quantity: number;
}

export interface BffOrderDto {
  id: string;
  orderNumber: string;
  status: string;
  isRead: boolean;
  customerName: string;
  contactMethod: string;
  contactValue: string;
  country: string;
  city: string;
  iconId: string | null;
  iconTitleSnapshot: string;
  iconSlugSnapshot: string;
  primaryProductId: string | null;
  primaryProductNameSnapshot: string;
  primaryProductSlugSnapshot: string;
  primaryProductPriceCentsSnapshot: number;
  primaryProductPhotoSnapshot: string;
  items: BffOrderItemDto[];
  totalPriceCents: number;
  currency: string;
  comment: string;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

function toBffOrderItemDto(worker: WorkerIconOrderItemDto): BffOrderItemDto {
  return {
    id: worker.id,
    optionId: worker.optionId,
    optionNameSnapshot: worker.optionNameSnapshot,
    priceCentsSnapshot: worker.priceCentsSnapshot,
    quantity: worker.quantity,
  };
}

export function toBffOrderDto(worker: WorkerIconOrderDto): BffOrderDto {
  return {
    id: worker.id,
    orderNumber: worker.orderNumber,
    status: worker.status,
    isRead: worker.isRead,
    customerName: worker.customerName,
    contactMethod: worker.contactMethod,
    contactValue: worker.contactValue,
    country: worker.country,
    city: worker.city,
    iconId: worker.iconId,
    iconTitleSnapshot: worker.iconTitleSnapshot,
    iconSlugSnapshot: worker.iconSlugSnapshot,
    primaryProductId: worker.primaryProductId,
    primaryProductNameSnapshot: worker.primaryProductNameSnapshot,
    primaryProductSlugSnapshot: worker.primaryProductSlugSnapshot,
    primaryProductPriceCentsSnapshot: worker.primaryProductPriceCentsSnapshot,
    primaryProductPhotoSnapshot: worker.primaryProductPhotoSnapshot,
    items: worker.items.map(toBffOrderItemDto),
    totalPriceCents: worker.totalPriceCents,
    currency: worker.currency,
    comment: worker.comment,
    adminNote: worker.adminNote,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}

export function toBffOrderDtoList(workers: WorkerIconOrderDto[]): BffOrderDto[] {
  return workers.map(toBffOrderDto);
}

/** Admin -> Worker payload for PUT. Deliberately always partial in
 * practice (the admin http resource sends exactly one of these two keys
 * per call, never both) — see the Phase 2B-5B report's UPDATE SEMANTICS
 * section for why, and svet-ikony's updateIconOrder() for the (already
 * correct) merge-against-current-row behavior this relies on. */
export interface WorkerOrderWritePayload {
  status?: string;
  adminNote?: string;
}
