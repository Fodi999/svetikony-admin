import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { middleware } from "./middleware";

/**
 * Phase 1D.2 Part C: behaviorally verifies (not just reads) the claim
 * middleware.ts's own doc comment makes -- that its admin_session
 * cookie check is a cheap UX redirect based on *presence* only, never
 * real authentication, and that real security lives entirely at the BFF
 * route level (app/api/bff/_lib/auth.ts's withAuth, see auth.test.ts's
 * "401s when the upstream rejects the session" for the corresponding
 * proof that an invalid token is rejected there). This file exercises
 * the actual exported `middleware` function against real NextRequest
 * objects -- not a mock of it -- so it is a genuine behavioral check of
 * what would happen without Basic Auth removed, run ahead of that future
 * decision.
 */

const ENV_KEYS = ["GATE_USERNAME", "GATE_PASSWORD"] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  process.env.GATE_USERNAME = "gate-user";
  process.env.GATE_PASSWORD = "gate-pass";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

function basicAuthHeader(): string {
  return `Basic ${Buffer.from("gate-user:gate-pass").toString("base64")}`;
}

function request(path: string, opts: { basicAuth?: boolean; cookie?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.basicAuth !== false) headers.authorization = basicAuthHeader();
  if (opts.cookie !== undefined) headers.cookie = `admin_session=${opts.cookie}`;
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("middleware", () => {
  it("rejects every request with no Basic Auth credential, regardless of cookie", () => {
    const response = middleware(request("/calendar", { basicAuth: false }));
    expect(response.status).toBe(401);
  });

  describe("cookie-presence check is UX only -- never real authentication", () => {
    it("with Basic Auth but NO admin_session cookie, a protected page redirects to /login (presence check)", () => {
      const response = middleware(request("/calendar"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
    });

    it("a completely fake, structurally-invalid cookie value is NOT rejected by middleware -- it passes through, because middleware never validates the value, only checks it exists", () => {
      const response = middleware(request("/calendar", { cookie: "totally-fake-not-a-real-token" }));
      expect(response.status).toBe(200); // NextResponse.next() -- middleware itself never says "invalid"
      expect(response.headers.get("location")).toBeNull();
    });

    it("/api/bff/** is never subject to the cookie-presence redirect, even with zero cookie -- real auth is withAuth's job downstream", () => {
      const response = middleware(request("/api/bff/icons", { cookie: undefined }));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("/login and /no-access stay reachable with no cookie (must be reachable before any session exists)", () => {
      for (const path of ["/login", "/no-access"]) {
        const response = middleware(request(path));
        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      }
    });
  });
});
