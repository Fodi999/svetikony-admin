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
  slug: string;
  title: string;
  reference: string;
  text: string;
  explanation: string;
  language: string;
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
 * gospel endpoint family — not lib/api/mock/gospel.ts, not sessionStorage.
 * Same boundary every BFF test in this codebase already uses (mocking
 * global fetch to stand in for the upstream Worker), kept stateful across
 * calls specifically to prove persistence semantics.
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

    if (url.endsWith("/api/admin/church-content/gospel") && method === "GET") {
      return json(200, [...store.values()]);
    }

    if (url.endsWith("/api/admin/church-content/gospel") && method === "POST") {
      const body = JSON.parse(init!.body as string) as Partial<FakeRow>;
      counter += 1;
      const id = `gospel-${counter}`;
      const now = new Date().toISOString();
      const row: FakeRow = {
        id,
        siteId: "site-1",
        iconId: body.iconId ?? null,
        calendarDayId: body.calendarDayId ?? null,
        slug: body.slug ?? "",
        title: body.title ?? "",
        reference: body.reference ?? "",
        // Matches the real backend exactly: text defaults to '' and is
        // never validated as required (lib/d1/repositories/gospel.ts's
        // createGospel only calls required() on title).
        text: body.text ?? "",
        explanation: body.explanation ?? "",
        language: body.language ?? "uk",
        status: body.status ?? "draft",
        isGlobal: false,
        createdAt: now,
        updatedAt: now,
      };
      store.set(id, row);
      return json(201, row);
    }

    const idMatch = /\/gospel\/([^/?]+)$/.exec(url);
    const id = idMatch ? decodeURIComponent(idMatch[1]!) : null;

    if (id && method === "GET") {
      const row = store.get(id);
      return row ? json(200, row) : json(404, { code: "NOT_FOUND", message: "Resource not found", details: "gospel reading not found" });
    }

    if (id && method === "PUT") {
      const row = store.get(id);
      if (!row) return json(404, { code: "NOT_FOUND", message: "Resource not found", details: "gospel reading not found" });
      const body = JSON.parse(init!.body as string) as Partial<FakeRow>;
      const updated: FakeRow = { ...row, ...body, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return json(200, updated);
    }

    if (id && method === "DELETE") {
      const existed = store.delete(id);
      return existed ? new Response(null, { status: 204 }) : json(404, { code: "NOT_FOUND", message: "Resource not found", details: "gospel reading not found" });
    }

    throw new Error(`createFakeUpstream: unhandled request ${method} ${url}`);
  });
}

describe("Gospel persistence proof (Phase 2B-3) — real BFF handlers against a stateful fake upstream, no mock resource, no sessionStorage", () => {
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

  it("create with empty text -> separate list sees it -> update fills in text/reference/status -> separate get sees the change -> delete -> subsequent get is a real 404", async () => {
    vi.stubGlobal("fetch", createFakeUpstream());

    // 1. Create with empty text (the real, allowed production state).
    const createResponse = await listPost(
      new NextRequest(
        "http://localhost/api/bff/gospel",
        withSessionCookie({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "Читання", slug: "chytannya", language: "uk", reference: "Мт. 1:1", text: "", status: "draft" }),
        }),
      ),
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string; text: string };
    expect(created.id).toBeTruthy();
    expect(created.text).toBe("");

    // 2. A completely separate list request sees it, still with empty text.
    const listResponse = await listGet(new NextRequest("http://localhost/api/bff/gospel", withSessionCookie()));
    const list = (await listResponse.json()) as { id: string; text: string }[];
    expect(list.find((g) => g.id === created.id)?.text).toBe("");

    // 3. Update: fill in real text, fix the reference, publish it.
    const updateResponse = await itemPut(
      new NextRequest(
        `http://localhost/api/bff/gospel/${created.id}`,
        withSessionCookie({
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "На початку було Слово...", reference: "Ів. 1:1-17", status: "published" }),
        }),
      ),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(updateResponse.status).toBe(200);

    // 4. A separate GET (not the update's own response) sees the new values.
    const afterUpdateResponse = await itemGet(
      new NextRequest(`http://localhost/api/bff/gospel/${created.id}`, withSessionCookie()),
      { params: Promise.resolve({ id: created.id }) },
    );
    const afterUpdate = (await afterUpdateResponse.json()) as { text: string; reference: string; status: string };
    expect(afterUpdate.text).toBe("На початку було Слово...");
    expect(afterUpdate.reference).toBe("Ів. 1:1-17");
    expect(afterUpdate.status).toBe("published");

    // 5. Delete (real hard delete, per the backend's actual semantics).
    const deleteResponse = await itemDelete(
      new NextRequest(`http://localhost/api/bff/gospel/${created.id}`, withSessionCookie({ method: "DELETE" })),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(deleteResponse.status).toBe(204);

    // 6. A subsequent read reflects the actual backend result: a real 404.
    const afterDeleteResponse = await itemGet(
      new NextRequest(`http://localhost/api/bff/gospel/${created.id}`, withSessionCookie()),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(afterDeleteResponse.status).toBe(404);
  });
});
