import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withSessionCookie } from "../_lib/test-support";
import { GET as itemGet, PUT as itemPut } from "./[id]/route";
import { PUT as readPut } from "./[id]/read/route";
import { GET as listGet } from "./route";

const ENV_KEYS = ["SVET_IKONY_API_BASE_URL", "SVET_IKONY_ADMIN_TOKEN"] as const;
const originalEnv: Record<string, string | undefined> = {};

type FakeOrder = {
  id: string;
  siteId: string;
  isGlobal: boolean;
  orderNumber: string;
  iconId: string | null;
  iconTitleSnapshot: string;
  iconSlugSnapshot: string;
  primaryProductId: string | null;
  primaryProductNameSnapshot: string;
  primaryProductSlugSnapshot: string;
  primaryProductPriceCentsSnapshot: number;
  primaryProductPhotoSnapshot: string;
  customerName: string;
  contactMethod: string;
  contactValue: string;
  preferredContactChannel: string;
  country: string;
  city: string;
  consecrationRequested: boolean;
  comment: string;
  consentGiven: boolean;
  status: string;
  adminNote: string;
  totalPriceCents: number;
  currency: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  items: unknown[];
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * A stateful fake of svet-ikony's real /api/admin/church-content/
 * icon-orders endpoint family, seeded with one order representing the
 * real DTO shape (not lib/api/mock/orders.ts, not sessionStorage). PUT
 * mirrors the real updateIconOrder() exactly: merges against the CURRENT
 * row for whichever of status/adminNote is omitted (verified directly
 * against that function during design — see the Phase 2B-5A report's
 * UPDATE SEMANTICS section) — this is the one real behavior this fake
 * must get right, since it's the whole point of the "status update
 * doesn't clobber note" proof below.
 */
function createFakeUpstream(seed: FakeOrder) {
  let row: FakeOrder = { ...seed };

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();

    if (url.includes("/api/admin/auth/session")) {
      return json(200, {
        user: { id: "u1", name: "OrderManager", email: "om@x.com", role: "order_manager" },
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
    }

    if (url.endsWith("/api/admin/church-content/icon-orders") && method === "GET") {
      return json(200, [row]);
    }

    if (url.endsWith(`/icon-orders/${row.id}/read`) && method === "PUT") {
      row = { ...row, isRead: true, updatedAt: new Date().toISOString() };
      return new Response(null, { status: 204 });
    }

    if (url.endsWith(`/icon-orders/${row.id}`) && method === "GET") {
      return json(200, row);
    }

    if (url.endsWith(`/icon-orders/${row.id}`) && method === "PUT") {
      const body = JSON.parse(init!.body as string) as { status?: string; adminNote?: string };
      row = {
        ...row,
        status: body.status ?? row.status,
        adminNote: body.adminNote ?? row.adminNote,
        updatedAt: new Date().toISOString(),
      };
      return json(200, row);
    }

    throw new Error(`createFakeUpstream: unhandled request ${method} ${url}`);
  });
}

function seedOrder(): FakeOrder {
  return {
    id: "order-real-1",
    siteId: "site-1",
    isGlobal: false,
    orderNumber: "IK-000099",
    iconId: "icon-1",
    iconTitleSnapshot: "Ікона «Спас Нерукотворний»",
    iconSlugSnapshot: "spas-nerukotvornyi",
    primaryProductId: null,
    primaryProductNameSnapshot: "",
    primaryProductSlugSnapshot: "",
    primaryProductPriceCentsSnapshot: 0,
    primaryProductPhotoSnapshot: "",
    customerName: "Тестовий Клієнт",
    contactMethod: "phone",
    contactValue: "+380990000000",
    preferredContactChannel: "",
    country: "Україна",
    city: "Львів",
    consecrationRequested: false,
    comment: "",
    consentGiven: true,
    status: "new",
    adminNote: "",
    totalPriceCents: 99900,
    currency: "UAH",
    isRead: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    items: [],
  };
}

describe("Orders persistence proof (Phase 2B-5B) — real BFF handlers against a stateful fake upstream, no mock resource, no sessionStorage", () => {
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

  it("seeded order visible in LIST and GET -> status update seen separately, note unchanged -> note update seen separately, status unchanged -> mark-read seen separately", async () => {
    vi.stubGlobal("fetch", createFakeUpstream(seedOrder()));

    // 1. LIST sees the seeded order.
    const listResponse = await listGet(new NextRequest("http://localhost/api/bff/orders", withSessionCookie()));
    const list = (await listResponse.json()) as { id: string; orderNumber: string }[];
    expect(list.find((o) => o.id === "order-real-1")?.orderNumber).toBe("IK-000099");

    // 2. GET sees it too.
    const getResponse = await itemGet(new NextRequest("http://localhost/api/bff/orders/order-real-1", withSessionCookie()), {
      params: Promise.resolve({ id: "order-real-1" }),
    });
    const initial = (await getResponse.json()) as { status: string; adminNote: string; isRead: boolean };
    expect(initial.status).toBe("new");
    expect(initial.adminNote).toBe("");
    expect(initial.isRead).toBe(false);

    // 3. Status update -- sends only {status}.
    await itemPut(
      new NextRequest(
        "http://localhost/api/bff/orders/order-real-1",
        withSessionCookie({ method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "contacted" }) }),
      ),
      { params: Promise.resolve({ id: "order-real-1" }) },
    );

    // A SEPARATE GET sees the new status, and the note is still untouched.
    const afterStatus = await itemGet(new NextRequest("http://localhost/api/bff/orders/order-real-1", withSessionCookie()), {
      params: Promise.resolve({ id: "order-real-1" }),
    });
    const afterStatusBody = (await afterStatus.json()) as { status: string; adminNote: string };
    expect(afterStatusBody.status).toBe("contacted");
    expect(afterStatusBody.adminNote).toBe("");

    // 4. Note update -- sends only {adminNote}.
    await itemPut(
      new NextRequest(
        "http://localhost/api/bff/orders/order-real-1",
        withSessionCookie({
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ adminNote: "Зв'язались, чекаємо підтвердження." }),
        }),
      ),
      { params: Promise.resolve({ id: "order-real-1" }) },
    );

    // A SEPARATE GET sees the new note, and the status (set in step 3) is still untouched.
    const afterNote = await itemGet(new NextRequest("http://localhost/api/bff/orders/order-real-1", withSessionCookie()), {
      params: Promise.resolve({ id: "order-real-1" }),
    });
    const afterNoteBody = (await afterNote.json()) as { status: string; adminNote: string };
    expect(afterNoteBody.status).toBe("contacted"); // still contacted, not reset by the note update
    expect(afterNoteBody.adminNote).toBe("Зв'язались, чекаємо підтвердження.");

    // 5. Mark read.
    const readResponse = await readPut(
      new NextRequest("http://localhost/api/bff/orders/order-real-1/read", withSessionCookie({ method: "PUT" })),
      { params: Promise.resolve({ id: "order-real-1" }) },
    );
    expect(readResponse.status).toBe(204);

    // A SEPARATE GET sees isRead=true, with status/note both still intact.
    const afterRead = await itemGet(new NextRequest("http://localhost/api/bff/orders/order-real-1", withSessionCookie()), {
      params: Promise.resolve({ id: "order-real-1" }),
    });
    const afterReadBody = (await afterRead.json()) as { isRead: boolean; status: string; adminNote: string };
    expect(afterReadBody.isRead).toBe(true);
    expect(afterReadBody.status).toBe("contacted");
    expect(afterReadBody.adminNote).toBe("Зв'язались, чекаємо підтвердження.");
  });
});
