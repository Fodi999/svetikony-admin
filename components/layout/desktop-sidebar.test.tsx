import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnsavedChangesProvider } from "@/components/feedback/unsaved-changes-context";
import { DesktopSidebar } from "./desktop-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/orders",
  useRouter: () => ({ push: vi.fn() }),
}));

const mockUnreadCount = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ apiClient: { orders: { unreadCount: mockUnreadCount } } }));

let canViewOrders = true;
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ canView: (area: string) => (area === "orders" ? canViewOrders : true) }),
}));

function renderSidebar() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UnsavedChangesProvider>
        <DesktopSidebar />
      </UnsavedChangesProvider>
    </QueryClientProvider>,
  );
}

describe("DesktopSidebar -- unread order badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canViewOrders = true;
    window.localStorage.clear();
  });

  it("shows no badge next to Замовлення when the unread count is 0", async () => {
    mockUnreadCount.mockResolvedValue(0);
    const { container } = renderSidebar();

    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalled());
    await screen.findByText("Замовлення");
    expect(container.querySelector(".bg-destructive")).not.toBeInTheDocument();
  });

  it("shows a red badge with the exact count next to Замовлення when unread orders exist", async () => {
    mockUnreadCount.mockResolvedValue(1);
    renderSidebar();

    const badge = await screen.findByText("1");
    expect(badge.className).toContain("bg-destructive");
    expect(badge.className).toContain("text-white");
  });

  it("caps the sidebar badge at 99+ same as the badge component itself", async () => {
    mockUnreadCount.mockResolvedValue(250);
    renderSidebar();

    expect(await screen.findByText("99+")).toBeInTheDocument();
  });

  it("does not add a badge to any other nav item", async () => {
    mockUnreadCount.mockResolvedValue(4);
    renderSidebar();

    await screen.findByText("4");
    const calendarLink = screen.getByRole("link", { name: "Церковний календар" });
    expect(calendarLink.querySelector(".bg-destructive")).toBeNull();
  });

  it("a role without Orders access never issues the unread-count request, and the Orders link itself is hidden (existing canView filter, unchanged)", async () => {
    canViewOrders = false;
    mockUnreadCount.mockResolvedValue(5);
    renderSidebar();

    await screen.findByText("Світ Ікони");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockUnreadCount).not.toHaveBeenCalled();
    expect(screen.queryByText("Замовлення")).not.toBeInTheDocument();
  });
});
