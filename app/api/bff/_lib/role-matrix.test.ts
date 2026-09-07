import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accessLevel } from "@/lib/auth/permissions";
import type { Role } from "@/types/entities";
import { withAuth } from "./auth";
import { isAuditCall, mockAuthenticatedFetch, withSessionCookie } from "./test-support";

/**
 * Phase 1C representative integration tests: one real BFF route per area
 * proves the withAuth() retrofit actually enforces the real permission
 * matrix (lib/auth/permissions.ts) end-to-end, not just in the unit-level
 * withAuth tests already added in Phase 1B (app/api/bff/_lib/auth.test.ts,
 * kept, still passing). Real matrix values used throughout — not invented
 * examples:
 *
 *   super_admin:    content=edit catalog=edit orders=edit settings=edit media=edit telegram=edit
 *   editor:         content=edit catalog=edit orders=view settings=none media=edit telegram=none
 *   order_manager:  content=none catalog=edit orders=edit settings=none media=edit telegram=none
 *   viewer:         content=view catalog=view orders=view settings=none media=view telegram=none
 */

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

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

function okResponse(body: unknown = []) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function resourceCallCount(fetchMock: ReturnType<typeof mockAuthenticatedFetch>): number {
  return fetchMock.mock.calls.filter(([url]) => !String(url).includes("/api/admin/auth/session") && !isAuditCall(url)).length;
}

describe("Role matrix — CONTENT area (real route: prayers)", () => {
  it("viewer GET allowed", async () => {
    const { GET } = await import("../prayers/route");
    vi.stubGlobal("fetch", mockAuthenticatedFetch("viewer", () => okResponse([])));
    const response = await GET(new NextRequest("http://localhost/api/bff/prayers", withSessionCookie()));
    expect(response.status).toBe(200);
  });

  it("viewer POST 403 (viewer.content = view, not edit)", async () => {
    const { POST } = await import("../prayers/route");
    const fetchMock = mockAuthenticatedFetch("viewer", () => okResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(
      new NextRequest("http://localhost/api/bff/prayers", withSessionCookie({ method: "POST", body: "{}" })),
    );
    expect(response.status).toBe(403);
    expect(resourceCallCount(fetchMock)).toBe(0);
  });

  it("editor POST allowed (editor.content = edit)", async () => {
    const { POST } = await import("../prayers/route");
    vi.stubGlobal(
      "fetch",
      mockAuthenticatedFetch("editor", () => okResponse({ id: "p1", title: "x", slug: "x" })),
    );
    const response = await POST(
      new NextRequest("http://localhost/api/bff/prayers", withSessionCookie({ method: "POST", body: "{}" })),
    );
    expect(response.status).toBe(200);
  });
});

describe("Role matrix — CATALOG area (real route: products)", () => {
  it("viewer GET allowed", async () => {
    const { GET } = await import("../products/route");
    vi.stubGlobal("fetch", mockAuthenticatedFetch("viewer", () => okResponse([])));
    const response = await GET(new NextRequest("http://localhost/api/bff/products", withSessionCookie()));
    expect(response.status).toBe(200);
  });

  it("viewer POST 403 (viewer.catalog = view, not edit)", async () => {
    const { POST } = await import("../products/route");
    const fetchMock = mockAuthenticatedFetch("viewer", () => okResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(
      new NextRequest("http://localhost/api/bff/products", withSessionCookie({ method: "POST", body: "{}" })),
    );
    expect(response.status).toBe(403);
    expect(resourceCallCount(fetchMock)).toBe(0);
  });

  it("order_manager POST allowed (order_manager.catalog = edit, per the real matrix)", async () => {
    const { POST } = await import("../products/route");
    vi.stubGlobal(
      "fetch",
      mockAuthenticatedFetch("order_manager", () => okResponse({ id: "p1", name: "x" })),
    );
    const response = await POST(
      new NextRequest("http://localhost/api/bff/products", withSessionCookie({ method: "POST", body: "{}" })),
    );
    expect(response.status).toBe(200);
  });
});

describe("Role matrix — ORDERS area (mechanism proof: no real BFF route exists for orders yet, see Phase 1C report)", () => {
  // Orders is still entirely mock-backed on the data side (Phase 1C's own
  // scope explicitly doesn't wire it to real D1 — see item 10 of the
  // brief), so no app/api/bff/orders/** route exists to integration-test
  // against. This proves the withAuth() mechanism itself correctly honors
  // area="orders" against the real matrix, so wiring a real orders route
  // later is a pure "reuse withAuth(POLICY-equivalent)" exercise with no
  // new authorization logic to write.
  it("viewer GET-equivalent (level: view) allowed (viewer.orders = view)", async () => {
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const wrapped = withAuth({ area: "orders", level: "view" }, handler);
    vi.stubGlobal("fetch", mockAuthenticatedFetch("viewer", () => okResponse({})));
    const response = await wrapped(new NextRequest("http://localhost/api/bff/orders", withSessionCookie()));
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("viewer mutation (level: edit) 403 (viewer.orders = view, not edit)", async () => {
    const handler = vi.fn();
    const wrapped = withAuth({ area: "orders", level: "edit" }, handler);
    vi.stubGlobal("fetch", mockAuthenticatedFetch("viewer", () => okResponse({})));
    const response = await wrapped(
      new NextRequest("http://localhost/api/bff/orders", withSessionCookie({ method: "POST", body: "{}" })),
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("order_manager mutation allowed (order_manager.orders = edit)", async () => {
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const wrapped = withAuth({ area: "orders", level: "edit" }, handler);
    vi.stubGlobal("fetch", mockAuthenticatedFetch("order_manager", () => okResponse({})));
    const response = await wrapped(
      new NextRequest("http://localhost/api/bff/orders", withSessionCookie({ method: "POST", body: "{}" })),
    );
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("Role matrix — MEDIA area (real routes: media, media/upload)", () => {
  it("viewer GET allowed", async () => {
    const { GET } = await import("../media/route");
    vi.stubGlobal("fetch", mockAuthenticatedFetch("viewer", () => okResponse({ items: [], cursor: null })));
    const response = await GET(new NextRequest("http://localhost/api/bff/media", withSessionCookie()));
    expect(response.status).toBe(200);
  });

  it("viewer mutation (DELETE) 403 (viewer.media = view, not edit)", async () => {
    const { DELETE } = await import("../media/route");
    const fetchMock = mockAuthenticatedFetch("viewer", () => okResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const response = await DELETE(
      new NextRequest("http://localhost/api/bff/media", withSessionCookie({ method: "DELETE", body: JSON.stringify({ key: "x" }) })),
    );
    expect(response.status).toBe(403);
    expect(resourceCallCount(fetchMock)).toBe(0);
  });

  it("editor upload allowed (editor.media = edit)", async () => {
    const { POST } = await import("../media/upload/route");
    vi.stubGlobal(
      "fetch",
      mockAuthenticatedFetch("editor", () =>
        okResponse({ key: "media/x/y.jpg", url: "https://x/y.jpg", contentType: "image/jpeg", size: 1, kind: "image" }),
      ),
    );
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" }));
    form.append("module", "alphabet");
    form.append("entityId", "x");
    form.append("purpose", "card");
    const response = await POST(new NextRequest("http://localhost/api/bff/media/upload", withSessionCookie({ method: "POST", body: form })));
    expect(response.status).toBe(200);
  });

  it("order_manager upload allowed (order_manager.media = edit)", async () => {
    const { POST } = await import("../media/upload/route");
    vi.stubGlobal(
      "fetch",
      mockAuthenticatedFetch("order_manager", () =>
        okResponse({ key: "media/x/y.jpg", url: "https://x/y.jpg", contentType: "image/jpeg", size: 1, kind: "image" }),
      ),
    );
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" }));
    form.append("module", "alphabet");
    form.append("entityId", "x");
    form.append("purpose", "card");
    const response = await POST(new NextRequest("http://localhost/api/bff/media/upload", withSessionCookie({ method: "POST", body: form })));
    expect(response.status).toBe(200);
  });
});

describe("Role matrix — TELEGRAM area (real route: telegram/status) — editor/order_manager/viewer all forbidden, super_admin only", () => {
  const forbiddenRoles: Role[] = ["editor", "order_manager", "viewer"];

  for (const role of forbiddenRoles) {
    it(`${role} GET forbidden (403) even at view level — telegram is "none" for every role except super_admin`, async () => {
      const { GET } = await import("../telegram/status/route");
      const fetchMock = mockAuthenticatedFetch(role, () => okResponse({}));
      vi.stubGlobal("fetch", fetchMock);
      const response = await GET(new NextRequest("http://localhost/api/bff/telegram/status", withSessionCookie()));
      expect(response.status).toBe(403);
      expect(resourceCallCount(fetchMock)).toBe(0);
    });
  }

  it("super_admin GET allowed", async () => {
    const { GET } = await import("../telegram/status/route");
    vi.stubGlobal("fetch", mockAuthenticatedFetch("super_admin", () => okResponse({ botConnected: true })));
    const response = await GET(new NextRequest("http://localhost/api/bff/telegram/status", withSessionCookie()));
    expect(response.status).toBe(200);
  });
});

describe("super_admin — representative proof of maximum access", () => {
  it("the real permission matrix grants super_admin edit at every area", () => {
    const areas = ["content", "catalog", "orders", "settings", "media", "telegram"] as const;
    for (const area of areas) {
      expect(accessLevel("super_admin", area)).toBe("edit");
    }
  });

  it("real BFF integration: super_admin can mutate the most-restricted real area (telegram) — publishing a post", async () => {
    const { POST } = await import("../telegram/posts/[id]/publish/route");
    vi.stubGlobal(
      "fetch",
      mockAuthenticatedFetch("super_admin", () => okResponse({ id: "post-1", status: "sent" })),
    );
    const response = await POST(
      new NextRequest("http://localhost/api/bff/telegram/posts/post-1/publish", withSessionCookie({ method: "POST" })),
      { params: Promise.resolve({ id: "post-1" }) },
    );
    expect(response.status).toBe(200);
  });
});

describe("Direct bypass proof (item 9) — calling BFF routes directly, never through UI, with the real prayers route", () => {
  it("no cookie -> 401, upstream never called", async () => {
    const { POST } = await import("../prayers/route");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new NextRequest("http://localhost/api/bff/prayers", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("valid viewer cookie + forbidden write -> 403, upstream proxy never called (only the session check runs)", async () => {
    const { POST } = await import("../prayers/route");
    const fetchMock = mockAuthenticatedFetch("viewer", () => okResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(
      new NextRequest("http://localhost/api/bff/prayers", withSessionCookie({ method: "POST", body: "{}" })),
    );
    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1); // session check only
    expect(resourceCallCount(fetchMock)).toBe(0);
  });

  it("valid editor cookie + forbidden telegram mutation -> 403, upstream never called", async () => {
    const { POST } = await import("../telegram/posts/route");
    const fetchMock = mockAuthenticatedFetch("editor", () => okResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(
      new NextRequest("http://localhost/api/bff/telegram/posts", withSessionCookie({ method: "POST", body: "{}" })),
    );
    expect(response.status).toBe(403);
    expect(resourceCallCount(fetchMock)).toBe(0);
  });

  it("valid super_admin -> handler reaches upstream (proxy call actually happens)", async () => {
    const { POST } = await import("../prayers/route");
    const fetchMock = mockAuthenticatedFetch("super_admin", () => okResponse({ id: "p1" }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(
      new NextRequest("http://localhost/api/bff/prayers", withSessionCookie({ method: "POST", body: "{}" })),
    );
    expect(response.status).toBe(200);
    expect(resourceCallCount(fetchMock)).toBe(1);
  });
});
