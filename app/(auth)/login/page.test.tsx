import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Simulates browser/password-manager autofill: sets the native input's
 * value through the DOM's own property setter (bypassing React's
 * value-tracking) and deliberately dispatches NO input/change event
 * afterwards -- the worst-case (and real-world-observed) version of the
 * bug this phase fixes, where autofill sets the DOM value without firing
 * anything React's synthetic event system would catch. A register()-bound
 * (uncontrolled) input must not depend on that event at all: RHF reads the
 * live DOM value straight from the ref at submit time.
 */
function autofill(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  nativeSetter.call(input, value);
}

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
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
  mockReplace.mockReset();
  mockLogin.mockReset();
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

  /**
   * Phase 2B-6.1: proves the post-login redirect is role-aware end to end
   * through the real onSubmit handler, not just getPostLoginPath() in
   * isolation (see lib/constants/navigation.test.ts for that).
   */
  it("redirects an order_manager to /orders after login, not to Dashboard ('/')", async () => {
    vi.stubEnv("NODE_ENV", "test");
    mockLogin.mockResolvedValue({ id: "u1", name: "Manager", email: "m@svetikony.com", role: "order_manager" });
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "m@svetikony.com");
    await user.type(screen.getByLabelText("Пароль"), "password123");
    await user.click(screen.getByRole("button", { name: /Увійти|Вхід/ }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/orders"));
  });

  it("redirects a super_admin to Dashboard ('/') after login -- unchanged from before this phase", async () => {
    vi.stubEnv("NODE_ENV", "test");
    mockLogin.mockResolvedValue({ id: "u2", name: "Admin", email: "a@svetikony.com", role: "super_admin" });
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "a@svetikony.com");
    await user.type(screen.getByLabelText("Пароль"), "password123");
    await user.click(screen.getByRole("button", { name: /Увійти|Вхід/ }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  /**
   * PHASE LOGIN AUTOFILL FIX: the actual bug -- both errors appeared
   * together while the fields visually looked filled. Reproduced here by
   * setting the DOM value the way autofill does (see the `autofill()`
   * helper above) and confirming submit both (a) receives the real DOM
   * values, not the stale "" defaultValues, and (b) never shows either
   * validation error. Before the fix (Controller-bound TextField), this
   * exact scenario left RHF's state at "" and both errors rendered.
   */
  it("autofill regression: DOM values set without a React onChange event still reach login() and never trigger validation errors", async () => {
    vi.stubEnv("NODE_ENV", "test");
    mockLogin.mockResolvedValue({ id: "u3", name: "Auto", email: "auto@svetikony.com", role: "super_admin" });
    const { default: LoginPage } = await import("./page");
    const { container } = render(<LoginPage />);

    const emailInput = container.querySelector<HTMLInputElement>("input#email")!;
    const passwordInput = container.querySelector<HTMLInputElement>("input#password")!;
    autofill(emailInput, "auto@svetikony.com");
    autofill(passwordInput, "s3cr3t-password");

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith({ email: "auto@svetikony.com", password: "s3cr3t-password" }));
    expect(screen.queryByText("Некоректний email")).not.toBeInTheDocument();
    expect(screen.queryByText("Мінімум 4 символи")).not.toBeInTheDocument();
  });

  it("shows 'Некоректний email' and never calls login() for a malformed email typed normally", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Пароль"), "password123");
    await user.click(screen.getByRole("button", { name: /Увійти|Вхід/ }));

    expect(await screen.findByText("Некоректний email")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("shows 'Мінімум 4 символи' and never calls login() for a too-short password typed normally", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "real@svetikony.com");
    await user.type(screen.getByLabelText("Пароль"), "abc");
    await user.click(screen.getByRole("button", { name: /Увійти|Вхід/ }));

    expect(await screen.findByText("Мінімум 4 символи")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("normal manual typing calls login() with the exact typed values", async () => {
    vi.stubEnv("NODE_ENV", "test");
    mockLogin.mockResolvedValue({ id: "u4", name: "Manual", email: "manual@svetikony.com", role: "super_admin" });
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "manual@svetikony.com");
    await user.type(screen.getByLabelText("Пароль"), "correct-password");
    await user.click(screen.getByRole("button", { name: /Увійти|Вхід/ }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith({ email: "manual@svetikony.com", password: "correct-password" }));
  });

  it("sets the correct autocomplete attributes for password-manager compatibility (username / current-password)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Пароль")).toHaveAttribute("autocomplete", "current-password");
  });

  /**
   * PHASE 3 -- Telegram passwordless login is now the primary path shown
   * on the page; the password form is kept only as a de-emphasized
   * rollback, not deleted.
   */
  describe("Telegram passwordless login (Phase 3, primary)", () => {
    it("shows the Telegram instructions and a link to @svit_ikony_admin_bot", async () => {
      vi.stubEnv("NODE_ENV", "test");
      const { default: LoginPage } = await import("./page");
      render(<LoginPage />);

      expect(screen.getByText("Безпечний вхід через Telegram")).toBeInTheDocument();
      expect(screen.getByText("@svit_ikony_admin_bot")).toBeInTheDocument();
      expect(screen.getByText("Надішліть /login")).toBeInTheDocument();
      expect(screen.getByText("Натисніть «Відкрити адмінку»")).toBeInTheDocument();

      const link = screen.getByText("Відкрити Telegram").closest("a");
      expect(link).not.toBeNull();
      expect(link).toHaveAttribute("href", "https://t.me/svit_ikony_admin_bot");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    });

    it("the password form is present but de-emphasized behind a collapsed disclosure, not deleted", async () => {
      vi.stubEnv("NODE_ENV", "test");
      const { default: LoginPage } = await import("./page");
      render(<LoginPage />);

      expect(screen.getByText("Увійти паролем (резервний спосіб)")).toBeInTheDocument();
      // The fields still exist in the DOM (accessible via label), proving
      // the rollback path is real, not removed -- only visually secondary.
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
    });
  });
});
