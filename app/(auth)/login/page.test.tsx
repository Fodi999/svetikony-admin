import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockLogin = vi.fn();
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ login: mockLogin, status: "unauthenticated" }),
}));

/**
 * The page's DevTestAccountsPanel gate is a module-level constant
 * (`process.env.NODE_ENV !== "production" ? dynamic(...) : null`),
 * evaluated once when the module is first imported -- exactly like
 * lib/api/index.ts's own FORCE_MOCK_API constant. `vi.stubEnv` only
 * changes `process.env.NODE_ENV` at runtime; a module already imported
 * with the old value won't re-evaluate it. So each test here resets the
 * module registry and re-imports fresh under its own stubbed NODE_ENV --
 * the same pattern lib/api/index.test.ts already uses, and a faithful
 * simulation of what actually varies between builds (webpack inlines
 * `process.env.NODE_ENV` per-build, not per-render).
 */
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("LoginPage", () => {
  it("shows the test-account quick-fill panel outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);
    // The panel is a next/dynamic import (see page.tsx's own doc comment on
    // why) -- it mounts asynchronously, unlike the rest of the form.
    expect(await screen.findByText(/admin@svetikony\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Тестові облікові записи/)).toBeInTheDocument();
  });

  it("never renders the test-account panel, plaintext demo credentials, or Stage 1 copy in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);
    expect(screen.queryByText(/Тестові облікові записи/)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin@svetikony\.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/editor@svetikony\.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stage 1/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("admin123");
  });

  it("still renders the real login form (email + password fields) in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
  });
});
