import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withSessionCookie } from "../_lib/test-support";
import { GET as itemGet, DELETE as itemDelete, PUT as itemPut } from "./[id]/route";
import { GET as listGet, POST as listPost } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

type FakeRow = {
  id: string;
  siteId: string;
  iconId: string | null;
  calendarDayId: string | null;
  title: string;
  slug: string;
  content: string;
  language: string;
  seoTitle: string;
  seoDescription: string;
  status: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * A genuine stateful fake of svet-ikony's real /api/admin/church-content/
 * articles endpoint family — not lib/api/mock/articles.ts, not
 * sessionStorage. This is the standard test boundary every BFF test in
 * this codebase already uses (mocking global fetch to stand in for the
 * upstream Worker) — the difference here is that this fake actually keeps
 * state across calls within one test, which is what proves persistence
 * semantics rather than just "a POST returns 201".
 */
function createFakeUpstream() {
  const store = new Map<string, FakeRow>();
  let counter = 0;

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();

    if (url.includes("/api/admin/auth/session")) {
      return json(200, {
        user: { id: "u1", name: "Editor", email: "e@x.com", role: "editor" },
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
    }

    if (url.endsWith("/api/admin/church-content/articles") && method === "GET") {
      return json(200, [...store.values()]);
    }

    if (url.endsWith("/api/admin/church-content/articles") && method === "POST") {
      const body = JSON.parse(init!.body as string) as Partial<FakeRow>;
      counter += 1;
      const id = `article-${counter}`;
      const now = new Date().toISOString();
      const row: FakeRow = {
        id,
        siteId: "site-1",
        iconId: body.iconId ?? null,
        calendarDayId: null,
        title: body.title ?? "",
        slug: body.slug ?? "",
        content: body.content ?? "",
        language: body.language ?? "uk",
        seoTitle: body.seoTitle ?? "",
        seoDescription: body.seoDescription ?? "",
        status: body.status ?? "draft",
        isGlobal: false,
        createdAt: now,
        updatedAt: now,
      };
      store.set(id, row);
      return json(201, row);
    }

    const idMatch = /\/articles\/([^/?]+)$/.exec(url);
    const id = idMatch ? decodeURIComponent(idMatch[1]!) : null;

    if (id && method === "GET") {
      const row = store.get(id);
      return row ? json(200, row) : json(404, { code: "NOT_FOUND", message: "Resource not found", details: "article not found" });
    }

    if (id && method === "PUT") {
      const row = store.get(id);
      if (!row) return json(404, { code: "NOT_FOUND", message: "Resource not found", details: "article not found" });
      const body = JSON.parse(init!.body as string) as Partial<FakeRow>;
      const updated: FakeRow = { ...row, ...body, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return json(200, updated);
    }

    if (id && method === "DELETE") {
      const existed = store.delete(id);
      return existed ? new Response(null, { status: 204 }) : json(404, { code: "NOT_FOUND", message: "Resource not found", details: "article not found" });
    }

    throw new Error(`createFakeUpstream: unhandled request ${method} ${url}`);
  });
}

describe("Articles persistence proof (Phase 2B-2) — real BFF handlers against a stateful fake upstream, no mock resource, no sessionStorage", () => {
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

  it("create -> separate list request sees it -> update -> separate get sees the update -> delete -> subsequent get is a real 404", async () => {
    vi.stubGlobal("fetch", createFakeUpstream());

    // 1. Create via the real POST handler.
    const createResponse = await listPost(
      new NextRequest(
        "http://localhost/api/bff/articles",
        withSessionCookie({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Стаття", slug: "stattya", language: "uk", content: "1234567890", status: "draft" }) }),
      ),
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string; title: string };
    expect(created.id).toBeTruthy();

    // 2. A completely separate list request (not reusing the create's response) sees it.
    const listResponse = await listGet(new NextRequest("http://localhost/api/bff/articles", withSessionCookie()));
    const list = (await listResponse.json()) as { id: string; title: string }[];
    expect(list.find((a) => a.id === created.id)?.title).toBe("Стаття");

    // 3. Update it.
    const updateResponse = await itemPut(
      new NextRequest(
        `http://localhost/api/bff/articles/${created.id}`,
        withSessionCookie({ method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Оновлена стаття" }) }),
      ),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(updateResponse.status).toBe(200);

    // 4. A separate GET (not the update's own response) sees the new value.
    const afterUpdateResponse = await itemGet(
      new NextRequest(`http://localhost/api/bff/articles/${created.id}`, withSessionCookie()),
      { params: Promise.resolve({ id: created.id }) },
    );
    const afterUpdate = (await afterUpdateResponse.json()) as { title: string };
    expect(afterUpdate.title).toBe("Оновлена стаття");

    // 5. Delete (real hard delete, per the backend's actual semantics).
    const deleteResponse = await itemDelete(
      new NextRequest(`http://localhost/api/bff/articles/${created.id}`, withSessionCookie({ method: "DELETE" })),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(deleteResponse.status).toBe(204);

    // 6. A subsequent read reflects the actual backend result: a real 404,
    // not a cached/stale success and not a silent fallback to fake data.
    const afterDeleteResponse = await itemGet(
      new NextRequest(`http://localhost/api/bff/articles/${created.id}`, withSessionCookie()),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(afterDeleteResponse.status).toBe(404);
  });
});
