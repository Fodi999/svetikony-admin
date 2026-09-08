import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnsavedChangesProvider } from "@/components/feedback/unsaved-changes-context";
import type { Order } from "@/types/entities";
import { OrderDetailView } from "./order-detail-view";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  updateStatus: vi.fn(),
  updateNote: vi.fn(),
  markRead: vi.fn(),
  unreadCount: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ apiClient: { orders: mockApi } }));

vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => ({ canView: () => true }) }));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    orderNumber: "SI-0001",
    status: "new",
    isRead: false,
    customerName: "Дмитро Фомін",
    contactMethod: "phone",
    contactValue: "+48576212418",
    items: [],
    totalPriceCents: 10000,
    currency: "UAH",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderDetail(id = "order-1") {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UnsavedChangesProvider>
        <OrderDetailView id={id} />
      </UnsavedChangesProvider>
    </QueryClientProvider>,
  );
}

describe("OrderDetailView -- auto mark-read on open", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.unreadCount.mockResolvedValue(0);
  });

  it("opening an unread order calls markRead(id) exactly once", async () => {
    mockApi.get.mockResolvedValue(order({ isRead: false }));
    mockApi.markRead.mockResolvedValue(order({ isRead: true }));

    renderDetail();

    await waitFor(() => expect(mockApi.markRead).toHaveBeenCalledTimes(1));
    expect(mockApi.markRead).toHaveBeenCalledWith("order-1");

    // Give any stray re-render a chance to double-fire -- it must not.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockApi.markRead).toHaveBeenCalledTimes(1);
  });

  it("the unread indicator clears in the UI after a successful markRead", async () => {
    // First fetch (on open) is unread; any refetch after markRead succeeds
    // (invalidate()'s own refetch, mirroring a real backend) comes back read.
    mockApi.get.mockResolvedValueOnce(order({ isRead: false })).mockResolvedValue(order({ isRead: true }));
    // Deliberately deferred (not an already-resolved promise) so the test
    // can observe the "unread" render before letting markRead resolve --
    // both mocked promises settling in the same microtask flush would
    // otherwise let React batch straight past the intermediate state.
    let resolveMarkRead!: (value: Order) => void;
    mockApi.markRead.mockImplementation(() => new Promise<Order>((resolve) => (resolveMarkRead = resolve)));

    renderDetail();

    expect(await screen.findByText("Непрочитано")).toBeInTheDocument();
    await waitFor(() => expect(mockApi.markRead).toHaveBeenCalledTimes(1));

    resolveMarkRead(order({ isRead: true }));

    await waitFor(() => expect(screen.queryByText("Непрочитано")).not.toBeInTheDocument());
  });

  it("opening an already-read order never calls markRead", async () => {
    mockApi.get.mockResolvedValue(order({ isRead: true }));

    renderDetail();

    await screen.findByText("SI-0001");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockApi.markRead).not.toHaveBeenCalled();
  });

  it("a markRead failure keeps the unread indicator -- the badge is never silently cleared", async () => {
    mockApi.get.mockResolvedValue(order({ isRead: false }));
    mockApi.markRead.mockRejectedValue(new Error("network error"));

    renderDetail();

    await waitFor(() => expect(mockApi.markRead).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(screen.getByText("Непрочитано")).toBeInTheDocument();
  });

  it("has no manual mark-read button -- marking read is automatic on open", async () => {
    mockApi.get.mockResolvedValue(order({ isRead: false }));
    mockApi.markRead.mockResolvedValue(order({ isRead: true }));

    renderDetail();
    await screen.findByText("SI-0001");

    expect(screen.queryByRole("button", { name: "Позначити прочитаним" })).not.toBeInTheDocument();
  });
});
