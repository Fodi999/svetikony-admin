import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

function uploadRequest(fields: Record<string, string | Blob>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return new Request("http://localhost/api/bff/media/upload", { method: "POST", body: form });
}

describe("POST /api/bff/media/upload", () => {
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

  it("forwards the multipart body and attaches the server-side token, without exposing it back", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ key: "media/alphabet/x/card/uuid.jpg", url: "https://x/media/alphabet/x/card/uuid.jpg", contentType: "image/jpeg", size: 3, kind: "image" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
    const response = await POST(uploadRequest({ file, module: "alphabet", entityId: "x", purpose: "card" }));

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3001/api/admin/media/upload");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-secret-jwt-value");
    // Not asserting `instanceof FormData` here: under vitest's jsdom
    // environment, Request.formData() (undici) and the global `FormData`
    // constructor can be distinct realms, so a structurally-identical
    // FormData can fail a same-realm instanceof check even though it's
    // functionally correct — asserting its shape (get/append) is more robust.
    const forwardedForm = init.body as FormData;
    expect(typeof forwardedForm.get).toBe("function");
    // The upload route never reads the original filename (the Worker only
    // ever looks at .type/.size and mints its own UUID-based key — see
    // svet-ikony's generateMediaKey), so it's not asserted here; what must
    // survive the round-trip through request.formData() is the MIME type
    // and the exact binary content.
    const forwardedFile = forwardedForm.get("file") as File;
    expect(forwardedFile.type).toBe("image/jpeg");
    expect(await forwardedFile.arrayBuffer()).toEqual(await file.arrayBuffer());

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("Authorization")).toBeNull();
  });

  it("passes through an upstream error response unchanged", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported image MIME type", details: "image/gif" }), {
          status: 415,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const file = new File([new Uint8Array([1])], "a.gif", { type: "image/gif" });
    const response = await POST(uploadRequest({ file, module: "alphabet", entityId: "x", purpose: "card" }));
    expect(response.status).toBe(415);
    const body = await response.json();
    expect(body.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a 401 with no-store when the token is missing, without leaking the missing value", async () => {
    delete process.env.SVET_IKONY_ADMIN_TOKEN;
    const file = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    const response = await POST(uploadRequest({ file, module: "alphabet", entityId: "x", purpose: "card" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(await response.json())).not.toContain("test-secret-jwt-value");
  });

  it("returns a 502 on network failure without a stack trace", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const file = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    const response = await POST(uploadRequest({ file, module: "alphabet", entityId: "x", purpose: "card" }));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe("NETWORK_ERROR");
    expect(body).not.toHaveProperty("stack");
  });

  it("returns a 502 on upstream timeout (abort)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new DOMException("aborted", "AbortError"))));
    const file = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    const response = await POST(uploadRequest({ file, module: "alphabet", entityId: "x", purpose: "card" }));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.details).toBe("Upstream request timed out");
  });

  it("returns 400 when the body is not valid multipart form data", async () => {
    const response = await POST(new Request("http://localhost/api/bff/media/upload", { method: "POST", body: "not-multipart" }));
    expect(response.status).toBe(400);
  });
});
