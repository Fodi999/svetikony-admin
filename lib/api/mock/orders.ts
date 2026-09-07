import type { OrderQuery, OrdersApi } from "@/lib/api/client";
import { loadStore, matchesSearch, mockDelay, notFound, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockOrders } from "@/lib/mock-data/orders";
import type { Order } from "@/types/entities";

const STORE_KEY = "orders";
const store: Order[] = loadStore(STORE_KEY, mockOrders);
const persist = () => saveStore(STORE_KEY, store);

/** Dev/test mock only (NEXT_PUBLIC_FORCE_MOCK_API=true) -- production
 * uses lib/api/http/orders.ts against real D1 (Phase 2B-5B). Kept in
 * sync with the real OrdersApi shape: status and note updates are
 * separate calls, mark-read has no boolean parameter (the real backend
 * has no mark-unread endpoint either). */
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
    items = items.filter((o) => matchesSearch([o.orderNumber, o.customerName, o.contactValue], query?.search));
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((o) => o.id === id);
    if (!found) notFound("Замовлення");
    return found;
  },

  async updateStatus(id, status) {
    await mockDelay();
    const index = store.findIndex((o) => o.id === id);
    if (index === -1) notFound("Замовлення");
    store[index] = { ...store[index], status, updatedAt: new Date().toISOString() };
    persist();
    return store[index];
  },

  async updateNote(id, adminNote) {
    await mockDelay();
    const index = store.findIndex((o) => o.id === id);
    if (index === -1) notFound("Замовлення");
    store[index] = { ...store[index], adminNote, updatedAt: new Date().toISOString() };
    persist();
    return store[index];
  },

  async markRead(id) {
    await mockDelay(150);
    const index = store.findIndex((o) => o.id === id);
    if (index === -1) notFound("Замовлення");
    store[index] = { ...store[index], isRead: true, updatedAt: new Date().toISOString() };
    persist();
    return store[index];
  },
};
