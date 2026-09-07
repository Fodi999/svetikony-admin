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

function logoutRequest(cookie?: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/bff/auth/logout", {
    method: "POST",
    headers: { "sec-fetch-site": "same-origin", ...(cookie ? { cookie: `admin_session=${cookie}` } : {}), ...headers },
  });
}

function clearedCookieHeader(response: Response): string {
  return response.headers.get("set-cookie") ?? "";
}

describe("POST /api/bff/auth/logout", () => {
  it("valid session -> calls upstream revoke and clears the cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ revoked: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(logoutRequest("good-token"));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/admin/auth/logout");
    expect((init.headers as Record<string, string>)["X-Admin-Session"]).toBe("good-token");

    const setCookie = clearedCookieHeader(response);
    expect(setCookie).toContain("admin_session=;");
  });

  it("already-invalid/expired upstream session -> cookie is still cleared, response still 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "AUTHENTICATION_ERROR" }), { status: 401 })));
    const response = await POST(logoutRequest("stale-token"));
    expect(response.status).toBe(200);
    expect(clearedCookieHeader(response)).toContain("admin_session=;");
  });

  it("no cookie at all -> still 200, still clears (no-op) cookie, upstream never called", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(logoutRequest());
    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(clearedCookieHeader(response)).toContain("admin_session=;");
  });

  it("upstream network failure -> still 200, cookie still cleared (logout never fails from the user's perspective)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const response = await POST(logoutRequest("good-token"));
    expect(response.status).toBe(200);
    expect(clearedCookieHeader(response)).toContain("admin_session=;");
  });

  it("repeated logout calls are all safe/idempotent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ revoked: false }), { status: 200 })));
    const first = await POST(logoutRequest("good-token"));
    const second = await POST(logoutRequest("good-token"));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it("rejects a cross-site request before touching the cookie or upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(logoutRequest("good-token", { "sec-fetch-site": "cross-site" }));
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the cleared cookie has matching Path/SameSite/Secure semantics to the one that was set", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ revoked: true }), { status: 200 })));
    const response = await POST(logoutRequest("good-token"));
    const setCookie = clearedCookieHeader(response).toLowerCase();
    expect(setCookie).toContain("path=/");
    expect(setCookie).toContain("samesite=strict");
    expect(setCookie).toContain("httponly");
  });
});
