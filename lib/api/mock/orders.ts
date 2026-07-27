import type { OrderQuery, OrdersApi } from "@/lib/api/client";
import { loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockOrders } from "@/lib/mock-data/orders";
import type { Order } from "@/types/entities";

const STORE_KEY = "orders";
const store: Order[] = loadStore(STORE_KEY, mockOrders);
const persist = () => saveStore(STORE_KEY, store);

export const ordersResource: OrdersApi = {
  async list(query?: OrderQuery) {
    await mockDelay();
    let items = [...store];
    if (query?.status === "unread") {
      items = items.filter((o) => !o.isRead);
    } else if (query?.status) {
      items = items.filter((o) => o.status === query.status);
    }
    if (query?.dateFrom) items = items.filter((o) => o.createdAt >= query.dateFrom!);
    if (query?.dateTo) items = items.filter((o) => o.createdAt <= query.dateTo!);
    items = items.filter((o) =>
      matchesSearch([o.number, o.customerName, o.phone, o.email], query?.search),
    );
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((o) => o.id === id);
    if (!found) notFound("Замовлення");
    return found;
  },

  async updateStatus(id, values) {
    await mockDelay();
    const index = store.findIndex((o) => o.id === id);
    if (index === -1) notFound("Замовлення");
    const current = store[index];
    const historyEntry =
      values.status !== current.status
        ? [{ id: nextId("hist"), status: values.status, changedAt: nowIso() }]
        : [];
    const updated: Order = {
      ...current,
      status: values.status,
      isRead: values.isRead,
      internalNote: values.internalNote,
      statusHistory: [...current.statusHistory, ...historyEntry],
      updatedAt: nowIso(),
    };
    store[index] = updated;
    persist();
    return updated;
  },

  async markRead(id, isRead) {
    await mockDelay(150);
    const index = store.findIndex((o) => o.id === id);
    if (index === -1) notFound("Замовлення");
    store[index] = { ...store[index], isRead, updatedAt: nowIso() };
    persist();
    return store[index];
  },
};
