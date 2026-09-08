import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUnreadOrders } from "./use-unread-orders";

const mockUnreadCount = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ apiClient: { orders: { unreadCount: mockUnreadCount } } }));

let canViewOrders = true;
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ canView: (area: string) => (area === "orders" ? canViewOrders : true) }),
}));

function Harness() {
  const { count } = useUnreadOrders();
  return <p data-testid="count">{count}</p>;
}

function renderHarness() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe("useUnreadOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canViewOrders = true;
    mockUnreadCount.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches the count once on mount", async () => {
    mockUnreadCount.mockResolvedValue(3);
    renderHarness();

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("3"));
    expect(mockUnreadCount).toHaveBeenCalledTimes(1);
  });

  it("refetches on the configured 30s interval", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockUnreadCount.mockResolvedValue(1);
    renderHarness();

    await vi.waitFor(() => expect(mockUnreadCount).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(30_000);
    await vi.waitFor(() => expect(mockUnreadCount).toHaveBeenCalledTimes(2));

    await vi.advanceTimersByTimeAsync(30_000);
    await vi.waitFor(() => expect(mockUnreadCount).toHaveBeenCalledTimes(3));
  });

  it("refetches when the tab/window becomes visible again (TanStack's refetchOnWindowFocus, driven by visibilitychange)", async () => {
    mockUnreadCount.mockResolvedValue(1);
    renderHarness();
    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalledTimes(2));
  });

  it("stops fetching after unmount", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockUnreadCount.mockResolvedValue(1);
    const { unmount } = renderHarness();
    await vi.waitFor(() => expect(mockUnreadCount).toHaveBeenCalledTimes(1));

    unmount();
    const callsAtUnmount = mockUnreadCount.mock.calls.length;

    await vi.advanceTimersByTimeAsync(60_000);
    expect(mockUnreadCount).toHaveBeenCalledTimes(callsAtUnmount);
  });

  it("never issues the request for a role without Orders access", async () => {
    canViewOrders = false;
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Harness />
      </QueryClientProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockUnreadCount).not.toHaveBeenCalled();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});
