import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";

const mockGetSession = vi.fn();
vi.mock("@/lib/api", () => ({
  apiClient: { auth: { getSession: () => mockGetSession() } },
}));

function Consumer() {
  const { status, user } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? ""}</span>
    </div>
  );
}

afterEach(() => {
  mockGetSession.mockReset();
});

describe("AuthProvider session restoration (Phase 1B: no sessionStorage authority)", () => {
  it("restores the authenticated user from GET /api/bff/auth/session on mount -- simulates a hard refresh/new tab", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u1", name: "Admin", email: "admin@svetikony.com", role: "super_admin" },
      expiresAt: "2099-01-01T00:00:00.000Z",
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("status").textContent).toBe("loading");
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("authenticated"));
    expect(screen.getByTestId("email").textContent).toBe("admin@svetikony.com");
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("shows unauthenticated when there was never a session (getSession resolves null) -- no sessionStorage consulted", async () => {
    mockGetSession.mockResolvedValue(null);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("unauthenticated"));
  });

  it("shows expired when a session cookie was presented but rejected as no-longer-valid (getSession rejects)", async () => {
    mockGetSession.mockRejectedValue(new Error("session_expired"));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("expired"));
  });
});
