import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/types/api";
import { mediaHttpResource } from "./media";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("mediaHttpResource.uploadObject", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts multipart form data to the BFF upload endpoint and returns the MediaObjectDto", async () => {
    const dto = { key: "media/alphabet/x/card/uuid.jpg", url: "https://x/media/alphabet/x/card/uuid.jpg", contentType: "image/jpeg", size: 3, etag: "abc", kind: "image" };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto, 201));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
    const result = await mediaHttpResource.uploadObject!({ file, module: "alphabet", entityId: "x", purpose: "card" });

    expect(result).toEqual(dto);
    expect(fetchMock).toHaveBeenCalledWith("/api/bff/media/upload", expect.objectContaining({ method: "POST" }));
    const [, init] = fetchMock.mock.calls[0];
    const form = init.body as FormData;
    expect(form.get("module")).toBe("alphabet");
    expect(form.get("entityId")).toBe("x");
    expect(form.get("purpose")).toBe("card");
  });

  it("propagates a validation_error ApiError for a 400", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "VALIDATION_ERROR", details: "entityId is required" }, 400)));
    const file = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    await expect(mediaHttpResource.uploadObject!({ file, module: "alphabet", entityId: "", purpose: "card" })).rejects.toMatchObject({
      code: "validation_error",
    });
  });

  it("propagates a validation_error ApiError for a 415 unsupported MIME", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "UNSUPPORTED_MEDIA_TYPE", details: "image/gif" }, 415)));
    const file = new File([new Uint8Array([1])], "a.gif", { type: "image/gif" });
    await expect(mediaHttpResource.uploadObject!({ file, module: "alphabet", entityId: "x", purpose: "card" })).rejects.toMatchObject({
      code: "validation_error",
    });
  });

  it("propagates a validation_error ApiError for a 413 oversized file", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "PAYLOAD_TOO_LARGE" }, 413)));
    const file = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    await expect(mediaHttpResource.uploadObject!({ file, module: "alphabet", entityId: "x", purpose: "card" })).rejects.toMatchObject({
      code: "validation_error",
    });
  });

  it("propagates an unauthorized ApiError for a 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "AUTHENTICATION_ERROR" }, 401)));
    const file = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    await expect(mediaHttpResource.uploadObject!({ file, module: "alphabet", entityId: "x", purpose: "card" })).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("propagates a network_error ApiError when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const file = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    await expect(mediaHttpResource.uploadObject!({ file, module: "alphabet", entityId: "x", purpose: "card" })).rejects.toMatchObject({
      code: "network_error",
    });
  });
});

describe("mediaHttpResource legacy methods (not wired to any form yet)", () => {
  it("upload throws a controlled not_implemented ApiError without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const file = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    await expect(mediaHttpResource.upload(file)).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("list throws a controlled not_implemented ApiError without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(mediaHttpResource.list()).rejects.toMatchObject({ code: "not_implemented" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("mediaHttpResource.remove (Stage 2H — real, keyed by R2 object key)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("DELETEs the BFF media endpoint with the R2 key as the JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await mediaHttpResource.remove("media/calendar/draft/main/uuid.png");

    expect(fetchMock).toHaveBeenCalledWith("/api/bff/media", expect.objectContaining({ method: "DELETE" }));
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({ key: "media/calendar/draft/main/uuid.png" });
  });

  it("propagates a not_found ApiError for a 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "NOT_FOUND" }, 404)));
    await expect(mediaHttpResource.remove("media/calendar/draft/main/uuid.png")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("propagates a network_error ApiError when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(mediaHttpResource.remove("media/calendar/draft/main/uuid.png")).rejects.toMatchObject({
      code: "network_error",
    });
  });
});
