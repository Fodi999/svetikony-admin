import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxyAndMap, proxyJsonWrite } from "./proxy";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

function identity<T>(raw: T): T {
  return raw;
}

describe("proxyAndMap", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    process.env.SVET_IKONY_API_BASE_URL = "http://localhost:3001";
    process.env.SVET_IKONY_ADMIN_TOKEN = "test-secret-jwt-value";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    vi.unstubAllGlobals();
  });

  it("returns a 401 with no-store when the token is missing, without leaking the missing value", async () => {
    delete process.env.SVET_IKONY_ADMIN_TOKEN;
    const response = await proxyAndMap("/api/admin/church-content/alphabet", undefined, identity);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.code).toBe("AUTHENTICATION_ERROR");
    expect(JSON.stringify(body)).not.toContain("test-secret-jwt-value");
  });

  it("returns a 401 with no-store when the base URL is missing", async () => {
    delete process.env.SVET_IKONY_API_BASE_URL;
    const response = await proxyAndMap("/api/admin/church-content/alphabet", undefined, identity);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("attaches the Bearer token upstream but never echoes it back to the caller", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxyAndMap("/api/admin/church-content/alphabet", undefined, identity);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-secret-jwt-value");
    expect(response.headers.get("Authorization")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("preserves the upstream status code and body verbatim on error (404) — nothing to map", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "NOT_FOUND", message: "not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const response = await proxyAndMap("/api/admin/church-content/alphabet/missing", undefined, identity);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("returns a 502 with no stack trace when the upstream fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const response = await proxyAndMap("/api/admin/church-content/alphabet", undefined, identity);
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.code).toBe("NETWORK_ERROR");
    expect(body).not.toHaveProperty("stack");
  });

  it("returns a 502 when the upstream request times out (abort)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new DOMException("aborted", "AbortError"))));
    const response = await proxyAndMap("/api/admin/church-content/alphabet", undefined, identity);
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.details).toBe("Upstream request timed out");
  });

  it("forwards extra search params to the upstream URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await proxyAndMap("/api/admin/church-content/alphabet", new URLSearchParams({ language: "uk" }), identity);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3001/api/admin/church-content/alphabet?language=uk");
  });

  it("applies mapFn to a successful response before returning it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: "1", internalField: "secret" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const response = await proxyAndMap(
      "/api/admin/church-content/alphabet",
      undefined,
      (raw: { id: string; internalField: string }[]) => raw.map((item) => ({ id: item.id })),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual([{ id: "1" }]);
  });

  it("never leaks fields dropped by mapFn into the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "1", siteId: "internal-site-id", isGlobal: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const response = await proxyAndMap(
      "/api/admin/church-content/alphabet/1",
      undefined,
      (raw: { id: string }) => ({ id: raw.id }),
    );
    const bodyText = await response.text();
    expect(bodyText).not.toContain("siteId");
    expect(bodyText).not.toContain("isGlobal");
  });

  it("degrades to a safe 502 instead of crashing when the upstream body is not valid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 200, headers: { "content-type": "application/json" } })));
    const response = await proxyAndMap("/api/admin/church-content/alphabet", undefined, identity);
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.code).toBe("INTERNAL_ERROR");
  });

  it("degrades to a safe 502 instead of crashing when mapFn throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } })));
    const response = await proxyAndMap("/api/admin/church-content/alphabet", undefined, () => {
      throw new Error("mapper blew up");
    });
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("mapper blew up");
  });
});

/**
 * proxyJsonWrite's `timeoutMs` param exists specifically to fix a real bug:
 * AI generation routes (Calendar/Telegram) used the 10s default meant for
 * ordinary CRUD, so a real OpenAI text/image call would always abort mid-
 * flight and the admin would see a generic "no server connection" error
 * even though svet-ikony was still (successfully) working. These tests
 * lock in that a caller-supplied timeout is actually honored.
 */
describe("proxyJsonWrite timeoutMs", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    process.env.SVET_IKONY_API_BASE_URL = "http://localhost:3001";
    process.env.SVET_IKONY_ADMIN_TOKEN = "test-secret-jwt-value";
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not abort before a caller-supplied timeout elapses, even well past the 10s default", async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        capturedSignal = init.signal ?? undefined;
        return new Promise<Response>(() => {}); // never resolves on its own
      }),
    );

    void proxyJsonWrite("/api/admin/church-content/calendar-days/1/generate-image", "POST", undefined, identity, 60_000);
    await vi.advanceTimersByTimeAsync(15_000); // past the old 10s default
    expect(capturedSignal?.aborted).toBe(false);
  });

  it("still aborts once the caller-supplied timeout itself elapses", async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        capturedSignal = init.signal ?? undefined;
        return new Promise<Response>(() => {});
      }),
    );

    void proxyJsonWrite("/api/admin/church-content/calendar-days/1/generate-image", "POST", undefined, identity, 60_000);
    await vi.advanceTimersByTimeAsync(61_000);
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("falls back to the 10s default when no timeoutMs is given (ordinary CRUD writes)", async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        capturedSignal = init.signal ?? undefined;
        return new Promise<Response>(() => {});
      }),
    );

    void proxyJsonWrite("/api/admin/church-content/calendar-days/1", "PUT", { title: "x" }, identity);
    await vi.advanceTimersByTimeAsync(10_001);
    expect(capturedSignal?.aborted).toBe(true);
  });
});
