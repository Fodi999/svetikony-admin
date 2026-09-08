import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

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

function exchangeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/bff/auth/telegram/exchange", {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bff/auth/telegram/exchange", () => {
  it("a valid upstream exchange sets an HttpOnly admin_session cookie -- the exact same shape/attributes password login produces", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            token: "raw-opaque-upstream-token",
            user: { id: "u1", name: "Dmytro", email: "dmytro@svetikony.com", role: "super_admin" },
            expiresAt: "2099-01-01T00:00:00.000Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const response = await POST(exchangeRequest({ ticket: "raw-ticket-value" }));
    expect(response.status).toBe(200);

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("admin_session=raw-opaque-upstream-token");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=strict");

    const body = (await response.json()) as { user: { role: string }; expiresAt: string; token?: string };
    expect(body.user.role).toBe("super_admin");
    expect(body.token).toBeUndefined();
  });

  it("the raw session token never appears anywhere in the JSON response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ token: "super-secret-raw-token-xyz", user: { id: "u1", name: "A", email: "a@x.com", role: "super_admin" }, expiresAt: "2099-01-01T00:00:00.000Z" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const response = await POST(exchangeRequest({ ticket: "x" }));
    const bodyText = await response.text();
    expect(bodyText).not.toContain("super-secret-raw-token-xyz");
  });

  it("the raw ticket sent by the client is never echoed back in the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ token: "t", user: { id: "u1", name: "A", email: "a@x.com", role: "super_admin" }, expiresAt: "2099-01-01T00:00:00.000Z" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const response = await POST(exchangeRequest({ ticket: "a-very-distinctive-raw-ticket-value-123" }));
    const bodyText = await response.text();
    expect(bodyText).not.toContain("a-very-distinctive-raw-ticket-value-123");
  });

  it("the service credential never appears in the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ token: "t", user: { id: "u1", name: "A", email: "a@x.com", role: "super_admin" }, expiresAt: "2099-01-01T00:00:00.000Z" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const response = await POST(exchangeRequest({ ticket: "x" }));
    const bodyText = await response.text();
    expect(bodyText).not.toContain("test-service-token");
  });

  it("an invalid/expired ticket -> the upstream's generic 401 relayed unchanged, no cookie set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "AUTHENTICATION_ERROR", message: "Authentication failed", details: "Invalid or expired login ticket" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const response = await POST(exchangeRequest({ ticket: "already-used-or-expired" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("upstream unreachable -> safe generic error, no cookie, no stack trace leaked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED something internal")));
    const response = await POST(exchangeRequest({ ticket: "x" }));
    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toBeNull();
    const body = await response.text();
    expect(body).not.toContain("ECONNREFUSED");
  });

  it("rejects a request with a missing/empty ticket with 400, before ever calling upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(exchangeRequest({}));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a cross-site request before ever calling upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(exchangeRequest({ ticket: "x" }, { "sec-fetch-site": "cross-site" }));
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes the service credential upstream as a Bearer token, and the ticket in the body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ token: "t", user: { id: "u1", name: "A", email: "a@x.com", role: "super_admin" }, expiresAt: "2099-01-01T00:00:00.000Z" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await POST(exchangeRequest({ ticket: "the-raw-ticket" }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/admin/auth/telegram/exchange");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-service-token");
    expect(JSON.parse(init.body)).toEqual({ ticket: "the-raw-ticket" });
  });
});
