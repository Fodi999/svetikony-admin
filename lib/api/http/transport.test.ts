import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/types/api";
import { httpGet } from "./transport";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("httpGet", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a successful JSON response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ hello: "world" })));
    await expect(httpGet("/api/bff/alphabet")).resolves.toEqual({ hello: "world" });
  });

  it("requests with cache: no-store so the browser never serves a stale cached response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ hello: "world" }));
    vi.stubGlobal("fetch", fetchMock);
    await httpGet("/api/bff/alphabet");
    expect(fetchMock).toHaveBeenCalledWith("/api/bff/alphabet", expect.objectContaining({ cache: "no-store" }));
  });

  it("returns undefined for an empty 204-style body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 200, headers: { "content-type": "application/json" } })),
    );
    await expect(httpGet("/api/bff/alphabet")).resolves.toBeUndefined();
  });

  it("throws unknown ApiError for invalid JSON in a 2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not json", { status: 200, headers: { "content-type": "application/json" } })),
    );
    await expect(httpGet("/api/bff/alphabet")).rejects.toMatchObject({ code: "unknown" } satisfies Partial<ApiError>);
  });

  it("maps AUTHENTICATION_ERROR to an unauthorized ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "AUTHENTICATION_ERROR", message: "no token" }, 401)));
    try {
      await httpGet("/api/bff/alphabet");
      throw new Error("expected httpGet to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("unauthorized");
      expect((error as ApiError).status).toBe(401);
    }
  });

  it("maps AUTHORIZATION_ERROR to a forbidden ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "AUTHORIZATION_ERROR" }, 403)));
    await expect(httpGet("/api/bff/alphabet")).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("maps NOT_FOUND to a not_found ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "NOT_FOUND" }, 404)));
    await expect(httpGet("/api/bff/alphabet/missing")).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("maps CONFLICT to a conflict ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "CONFLICT" }, 409)));
    await expect(httpGet("/api/bff/alphabet")).rejects.toMatchObject({ code: "conflict", status: 409 });
  });

  it("maps INTERNAL_ERROR to a server_error ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "INTERNAL_ERROR" }, 500)));
    await expect(httpGet("/api/bff/alphabet")).rejects.toMatchObject({ code: "server_error", status: 500 });
  });

  it("falls back to unknown for an unrecognized error code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "SOMETHING_ELSE" }, 418)));
    await expect(httpGet("/api/bff/alphabet")).rejects.toMatchObject({ code: "unknown", status: 418 });
  });

  it("throws a network_error ApiError when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(httpGet("/api/bff/alphabet")).rejects.toMatchObject({ code: "network_error" });
  });

  it("throws a network_error ApiError when the request aborts (timeout)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new DOMException("aborted", "AbortError"))),
    );
    await expect(httpGet("/api/bff/alphabet")).rejects.toMatchObject({ code: "network_error" });
  });
});
