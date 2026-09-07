import { afterEach, describe, expect, it, vi } from "vitest";
import { authHttpResource } from "./auth";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authHttpResource (Phase 1B client-side AuthApi)", () => {
  it("login() posts to the local BFF login route and returns the session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "u1", name: "A", email: "a@x.com", role: "super_admin" }, expiresAt: "2099-01-01T00:00:00.000Z" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const session = await authHttpResource.login({ email: "a@x.com", password: "x" });
    expect(session.user.email).toBe("a@x.com");
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/bff/auth/login");
  });

  it("logout() posts to the local BFF logout route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await authHttpResource.logout();
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/bff/auth/logout");
  });

  it("getSession() returns null when there is no session cookie (no_session)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "AUTHENTICATION_ERROR", message: "Authentication failed", details: "no_session" }), { status: 401 }),
      ),
    );
    await expect(authHttpResource.getSession()).resolves.toBeNull();
  });

  it("getSession() rethrows when the session was presented but rejected (session_expired)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "AUTHENTICATION_ERROR", message: "Authentication failed", details: "session_expired" }), { status: 401 }),
      ),
    );
    await expect(authHttpResource.getSession()).rejects.toThrow();
  });

  it("getSession() returns the session on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ user: { id: "u1", name: "A", email: "a@x.com", role: "editor" }, expiresAt: "2099-01-01T00:00:00.000Z" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const session = await authHttpResource.getSession();
    expect(session?.user.role).toBe("editor");
  });
});
