import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));

const mockLoginWithTelegramTicket = vi.fn();
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ loginWithTelegramTicket: mockLoginWithTelegramTicket }),
}));

function setHash(hash: string) {
  window.history.replaceState(null, "", `/telegram-login${hash}`);
}

beforeEach(() => {
  mockReplace.mockReset();
  mockLoginWithTelegramTicket.mockReset();
  setHash("");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TelegramLoginPage", () => {
  it("extracts the ticket from location.hash and exchanges it", async () => {
    setHash("#ticket=raw-ticket-value-123");
    mockLoginWithTelegramTicket.mockResolvedValue({ id: "u1", name: "Dmytro", email: "d@x.com", role: "super_admin" });
    const { default: TelegramLoginPage } = await import("./page");
    render(<TelegramLoginPage />);

    await waitFor(() => expect(mockLoginWithTelegramTicket).toHaveBeenCalledWith("raw-ticket-value-123"));
  });

  it("strips the ticket from the URL/history immediately, before the exchange even resolves", async () => {
    setHash("#ticket=raw-ticket-value-123");
    mockLoginWithTelegramTicket.mockImplementation(() => new Promise(() => {})); // never resolves
    const { default: TelegramLoginPage } = await import("./page");
    render(<TelegramLoginPage />);

    await waitFor(() => expect(window.location.hash).toBe(""));
  });

  it("redirects to the role's post-login path on success -- super_admin lands on '/'", async () => {
    setHash("#ticket=good-ticket");
    mockLoginWithTelegramTicket.mockResolvedValue({ id: "u1", name: "Dmytro", email: "d@x.com", role: "super_admin" });
    const { default: TelegramLoginPage } = await import("./page");
    render(<TelegramLoginPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("redirects order_manager to /orders, not '/'", async () => {
    setHash("#ticket=good-ticket");
    mockLoginWithTelegramTicket.mockResolvedValue({ id: "u2", name: "Manager", email: "m@x.com", role: "order_manager" });
    const { default: TelegramLoginPage } = await import("./page");
    render(<TelegramLoginPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/orders"));
  });

  it("shows the checking state immediately, before the exchange resolves", async () => {
    setHash("#ticket=good-ticket");
    mockLoginWithTelegramTicket.mockImplementation(() => new Promise(() => {}));
    const { default: TelegramLoginPage } = await import("./page");
    render(<TelegramLoginPage />);

    expect(screen.getByText("Перевіряємо доступ…")).toBeInTheDocument();
  });

  it("shows a generic invalid/expired message on exchange failure -- no stack trace or API detail", async () => {
    setHash("#ticket=bad-ticket");
    mockLoginWithTelegramTicket.mockRejectedValue(new Error("Invalid or expired login ticket"));
    const { default: TelegramLoginPage } = await import("./page");
    render(<TelegramLoginPage />);

    expect(await screen.findByText(/Посилання недійсне або термін його дії завершився/)).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalledWith("/");
    expect(mockReplace).not.toHaveBeenCalledWith("/orders");
  });

  it("with no ticket in the hash at all, shows the invalid-link state without ever calling exchange", async () => {
    setHash("");
    const { default: TelegramLoginPage } = await import("./page");
    render(<TelegramLoginPage />);

    expect(await screen.findByText(/Посилання недійсне або термін його дії завершився/)).toBeInTheDocument();
    expect(mockLoginWithTelegramTicket).not.toHaveBeenCalled();
  });

  it("never writes the raw ticket to localStorage or sessionStorage", async () => {
    setHash("#ticket=super-secret-raw-ticket-xyz");
    mockLoginWithTelegramTicket.mockResolvedValue({ id: "u1", name: "Dmytro", email: "d@x.com", role: "super_admin" });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const { default: TelegramLoginPage } = await import("./page");
    render(<TelegramLoginPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    for (const call of setItemSpy.mock.calls) {
      expect(String(call[1])).not.toContain("super-secret-raw-ticket-xyz");
    }
  });
});
