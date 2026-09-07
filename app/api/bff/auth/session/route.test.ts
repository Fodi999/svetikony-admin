import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  process.env.SVET_IKONY_API_BASE_URL = "http://localhost:3001";
  process.env.SVET_IKONY_ADMIN_TOKEN = "test-service-token";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  vi.unstubAllGlobals();
});

function sessionRequest(cookie?: string) {
  return new NextRequest("http://localhost/api/bff/auth/session", {
    headers: cookie ? { cookie: `admin_session=${cookie}` } : {},
  });
}

describe("GET /api/bff/auth/session", () => {
  it("missing cookie -> 401", async () => {
    const response = await GET(sessionRequest());
    expect(response.status).toBe(401);
  });

  it("valid cookie -> returns the user", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ user: { id: "u1", name: "Admin", email: "admin@svetikony.com", role: "super_admin" }, expiresAt: "2099-01-01T00:00:00.000Z" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const response = await GET(sessionRequest("good-token"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: { email: string } };
    expect(body.user.email).toBe("admin@svetikony.com");
  });

  it("upstream reports expired/revoked -> 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "AUTHENTICATION_ERROR", message: "Authentication failed" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const response = await GET(sessionRequest("stale-token"));
    expect(response.status).toBe(401);
  });

  it("distinguishes no_session (missing cookie) from session_expired (rejected cookie) in the response details", async () => {
    const noCookie = await GET(sessionRequest());
    const noCookieBody = (await noCookie.json()) as { details: string };
    expect(noCookieBody.details).toBe("no_session");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "AUTHENTICATION_ERROR", message: "Authentication failed" }), { status: 401 })),
    );
    const staleCookie = await GET(sessionRequest("stale-token"));
    const staleCookieBody = (await staleCookie.json()) as { details: string };
    expect(staleCookieBody.details).toBe("session_expired");
  });

  it("never returns the raw cookie value or the service credential in the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ user: { id: "u1", name: "A", email: "a@x.com", role: "super_admin" }, expiresAt: "2099-01-01T00:00:00.000Z" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const response = await GET(sessionRequest("secret-raw-cookie-value"));
    const bodyText = await response.text();
    expect(bodyText).not.toContain("secret-raw-cookie-value");
    expect(bodyText).not.toContain("test-service-token");
  });

  it("sends the cookie value as X-Admin-Session and the service credential as Authorization, upstream", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ user: { id: "u1", name: "A", email: "a@x.com", role: "super_admin" }, expiresAt: "2099-01-01T00:00:00.000Z" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await GET(sessionRequest("good-token"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/admin/auth/session");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-service-token");
    expect(headers["X-Admin-Session"]).toBe("good-token");
  });
});
