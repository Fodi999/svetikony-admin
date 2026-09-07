import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isCrossSiteMutation, withAuth } from "./auth";

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

function requestWithCookie(url: string, options: { cookie?: string; method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(url, {
    method: options.method ?? "GET",
    headers: {
      ...(options.cookie ? { cookie: `admin_session=${options.cookie}` } : {}),
      ...options.headers,
    },
  });
}

function upstreamSessionOk(user = { id: "u1", name: "Test", email: "t@x.com", role: "super_admin" }) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ user, expiresAt: "2099-01-01T00:00:00.000Z" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

function upstreamSessionRejected(status = 401) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ code: "AUTHENTICATION_ERROR", message: "Authentication failed" }), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("withAuth", () => {
  it("401s with no cookie at all -- handler never invoked", async () => {
    const handler = vi.fn();
    const wrapped = withAuth({ area: "content", level: "view" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/x"));
    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("401s when the upstream rejects the session -- handler never invoked", async () => {
    vi.stubGlobal("fetch", upstreamSessionRejected());
    const handler = vi.fn();
    const wrapped = withAuth({ area: "content", level: "view" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/x", { cookie: "bad-token" }));
    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("403s a viewer attempting an edit-level action -- handler never invoked", async () => {
    vi.stubGlobal("fetch", upstreamSessionOk({ id: "u1", name: "Viewer", email: "v@x.com", role: "viewer" }));
    const handler = vi.fn();
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/x", { cookie: "good-token", method: "POST" }));
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("allows a viewer read where view access is granted -- handler runs", async () => {
    vi.stubGlobal("fetch", upstreamSessionOk({ id: "u1", name: "Viewer", email: "v@x.com", role: "viewer" }));
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const wrapped = withAuth({ area: "content", level: "view" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/x", { cookie: "good-token" }));
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("allows an editor a permitted content write -- handler runs", async () => {
    vi.stubGlobal("fetch", upstreamSessionOk({ id: "u1", name: "Editor", email: "e@x.com", role: "editor" }));
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/x", { cookie: "good-token", method: "POST" }));
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("403s an editor attempting a forbidden telegram write -- handler never invoked", async () => {
    vi.stubGlobal("fetch", upstreamSessionOk({ id: "u1", name: "Editor", email: "e@x.com", role: "editor" }));
    const handler = vi.fn();
    const wrapped = withAuth({ area: "telegram", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/x", { cookie: "good-token", method: "POST" }));
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("allows super_admin every permitted write -- handler runs", async () => {
    vi.stubGlobal("fetch", upstreamSessionOk({ id: "u1", name: "Super", email: "s@x.com", role: "super_admin" }));
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const wrapped = withAuth({ area: "telegram", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/x", { cookie: "good-token", method: "POST" }));
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("rejects a cross-site mutating request before ever resolving the session -- handler never invoked, fetch never called", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    const response = await wrapped(
      requestWithCookie("http://localhost/api/bff/x", { cookie: "good-token", method: "POST", headers: { "sec-fetch-site": "cross-site" } }),
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not apply the CSRF check to GET even with a cross-site header", async () => {
    vi.stubGlobal("fetch", upstreamSessionOk());
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const wrapped = withAuth({ area: "content", level: "view" }, handler);
    const response = await wrapped(
      requestWithCookie("http://localhost/api/bff/x", { cookie: "good-token", method: "GET", headers: { "sec-fetch-site": "cross-site" } }),
    );
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("forwards additional route-handler arguments (e.g. dynamic [id] params) through to the handler", async () => {
    vi.stubGlobal("fetch", upstreamSessionOk());
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const wrapped = withAuth<[{ params: { id: string } }]>({ area: "content", level: "view" }, handler);
    await wrapped(requestWithCookie("http://localhost/api/bff/x", { cookie: "good-token" }), { params: { id: "abc" } });
    expect(handler).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ user: expect.anything() }), { params: { id: "abc" } });
  });
});

/**
 * Phase 1D.1 — audit integration lives inside withAuth() itself (see that
 * function's own doc comment), so these tests exercise it exactly the
 * same way as the rest of this file: through withAuth(), never by calling
 * recordMutationAudit() directly. dispatchFetch below distinguishes the
 * three possible upstream calls a mutating request can now trigger:
 * session check, the resource's own handler-internal call (irrelevant
 * here since `handler` is a bare vi.fn(), not a real proxy), and the new
 * audit write.
 */
function dispatchFetch(options: {
  role?: { id: string; name: string; email: string; role: string };
  auditResponse?: Response | (() => Response) | "reject";
}) {
  const role = options.role ?? { id: "u1", name: "Super", email: "s@x.com", role: "super_admin" };
  return vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>((input) => {
    const url = String(input);
    if (url.includes("/api/admin/auth/session")) {
      return Promise.resolve(
        new Response(JSON.stringify({ user: role, expiresAt: "2099-01-01T00:00:00.000Z" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    if (url.includes("/api/admin/audit")) {
      if (options.auditResponse === "reject") return Promise.reject(new Error("audit endpoint unreachable"));
      if (typeof options.auditResponse === "function") return Promise.resolve(options.auditResponse());
      return Promise.resolve(options.auditResponse ?? new Response(JSON.stringify({ recorded: true }), { status: 201 }));
    }
    throw new Error(`dispatchFetch: unexpected call to ${url}`);
  });
}

function auditCallBody(fetchMock: ReturnType<typeof dispatchFetch>): Record<string, unknown> {
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/admin/audit"));
  if (!call) throw new Error("no audit call was made");
  return JSON.parse((call[1] as RequestInit).body as string);
}

describe("withAuth — Phase 1D.1 audit integration", () => {
  it("SUCCESS: authorized POST, handler returns 200 -> audit row recorded with success=true, statusCode=200", async () => {
    const fetchMock = dispatchFetch({});
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }, { status: 200 }));
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/prayers", { cookie: "good-token", method: "POST" }));
    expect(response.status).toBe(200);
    const body = auditCallBody(fetchMock);
    expect(body.success).toBe(true);
    expect(body.statusCode).toBe(200);
    expect(body.method).toBe("POST");
    expect(body.action).toBe("create");
  });

  it("BUSINESS FAILURE: authorized mutation, handler returns 400 -> audit success=false, original response status preserved", async () => {
    const fetchMock = dispatchFetch({});
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn().mockResolvedValue(Response.json({ code: "VALIDATION_ERROR" }, { status: 400 }));
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/prayers", { cookie: "good-token", method: "POST" }));
    expect(response.status).toBe(400); // preserved, not swallowed by audit logic
    const body = auditCallBody(fetchMock);
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
  });

  it("BUSINESS FAILURE: authorized mutation, handler returns 500 -> audit success=false, original response status preserved", async () => {
    const fetchMock = dispatchFetch({});
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn().mockResolvedValue(Response.json({ code: "INTERNAL_ERROR" }, { status: 500 }));
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/prayers", { cookie: "good-token", method: "PUT" }));
    expect(response.status).toBe(500);
    const body = auditCallBody(fetchMock);
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(500);
    expect(body.action).toBe("update");
  });

  it("EXCEPTION: handler throws -> a failure audit is attempted, then the original error is re-thrown unchanged", async () => {
    const fetchMock = dispatchFetch({});
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn().mockRejectedValue(new Error("boom"));
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    await expect(wrapped(requestWithCookie("http://localhost/api/bff/prayers", { cookie: "good-token", method: "DELETE" }))).rejects.toThrow(
      "boom",
    );
    const body = auditCallBody(fetchMock);
    expect(body.success).toBe(false);
    expect(body.statusCode).toBeUndefined();
    expect(body.action).toBe("delete");
  });

  it("AUDIT SUBSYSTEM FAILURE: the audit write itself fails (network error) -> the real successful response is still returned unchanged", async () => {
    const fetchMock = dispatchFetch({ auditResponse: "reject" });
    vi.stubGlobal("fetch", fetchMock);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }, { status: 200 }));
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/prayers", { cookie: "good-token", method: "POST" }));
    // The mutation itself succeeded and that must be what the user sees --
    // an audit-subsystem failure must never turn this into a 500.
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    // But the failure IS surfaced server-side, not silently dropped.
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("AUDIT SUBSYSTEM FAILURE: the audit endpoint itself returns a non-2xx -> the real response is still returned unchanged, failure logged", async () => {
    const fetchMock = dispatchFetch({ auditResponse: () => new Response("{}", { status: 500 }) });
    vi.stubGlobal("fetch", fetchMock);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }, { status: 200 }));
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/prayers", { cookie: "good-token", method: "POST" }));
    expect(response.status).toBe(200);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("AUTH DENIAL (401, no cookie): no audit call is made at all -- this was never an attempted business mutation", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/prayers", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AUTH DENIAL (403, insufficient role): resource handler and audit endpoint are both never called", async () => {
    const fetchMock = dispatchFetch({ role: { id: "u1", name: "Viewer", email: "v@x.com", role: "viewer" } });
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/prayers", { cookie: "good-token", method: "POST" }));
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    const auditCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/admin/audit"));
    expect(auditCalls).toHaveLength(0);
  });

  it("GET: an authenticated, authorized GET produces no audit call at all (Phase 1D.1 only audits mutations)", async () => {
    const fetchMock = dispatchFetch({});
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const wrapped = withAuth({ area: "content", level: "view" }, handler);
    const response = await wrapped(requestWithCookie("http://localhost/api/bff/prayers", { cookie: "good-token", method: "GET" }));
    expect(response.status).toBe(200);
    const auditCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/admin/audit"));
    expect(auditCalls).toHaveLength(0);
  });

  it("SECRETS: the audit payload never contains the raw session token, service token, or Authorization header value as data", async () => {
    const fetchMock = dispatchFetch({});
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const wrapped = withAuth({ area: "content", level: "edit" }, handler);
    await wrapped(requestWithCookie("http://localhost/api/bff/prayers", { cookie: "super-secret-cookie-value", method: "POST" }));
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/admin/audit"))!;
    const bodyText = (call[1] as RequestInit).body as string;
    expect(bodyText).not.toContain("super-secret-cookie-value");
    expect(bodyText).not.toContain("test-service-token");
    expect(bodyText).not.toContain("Authorization");
  });

  it("does NOT record an audit row when the mutating request never had a cookie in the first place (redundant with AUTH DENIAL above, kept as a direct regression guard)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await withAuth({ area: "content", level: "edit" }, vi.fn())(
      requestWithCookie("http://localhost/api/bff/prayers", { method: "DELETE" }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("isCrossSiteMutation", () => {
  it("allows a same-origin POST (Sec-Fetch-Site: same-origin)", () => {
    const request = requestWithCookie("http://localhost/api/bff/x", { method: "POST", headers: { "sec-fetch-site": "same-origin" } });
    expect(isCrossSiteMutation(request)).toBe(false);
  });

  it("rejects a cross-site POST (Sec-Fetch-Site: cross-site)", () => {
    const request = requestWithCookie("http://localhost/api/bff/x", { method: "POST", headers: { "sec-fetch-site": "cross-site" } });
    expect(isCrossSiteMutation(request)).toBe(true);
  });

  it("falls back to Origin when Sec-Fetch-Site is absent: matching origin is allowed", () => {
    const request = requestWithCookie("http://localhost/api/bff/x", { method: "POST", headers: { origin: "http://localhost" } });
    expect(isCrossSiteMutation(request)).toBe(false);
  });

  it("falls back to Origin when Sec-Fetch-Site is absent: mismatched origin is rejected", () => {
    const request = requestWithCookie("http://localhost/api/bff/x", { method: "POST", headers: { origin: "http://evil.example" } });
    expect(isCrossSiteMutation(request)).toBe(true);
  });

  it("never rejects GET/HEAD, even with a cross-site signal", () => {
    const get = requestWithCookie("http://localhost/api/bff/x", { method: "GET", headers: { "sec-fetch-site": "cross-site" } });
    expect(isCrossSiteMutation(get)).toBe(false);
  });

  it("does not reject PUT/PATCH/DELETE same-origin requests", () => {
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      const request = requestWithCookie("http://localhost/api/bff/x", { method, headers: { "sec-fetch-site": "same-origin" } });
      expect(isCrossSiteMutation(request)).toBe(false);
    }
  });
});
