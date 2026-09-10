import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.mjs";
import { Operator } from "../src/operator.mjs";
import { normalizePatch, entityPath, julianDate, entityNames } from "../src/catalog.mjs";
import { audit, coverage, relations } from "../src/audit.mjs";
import { AdminApi } from "../src/transport.mjs";
const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "svetikony-test-"));
  const store = new Store(dir, "http://localhost:3000");
  const data = Object.fromEntries(entityNames.map((e) => [e, []]));
  let writes = 0;
  let throwWrite = false;
  let globalEnabled = false;
  const api = {
    config: { origin: "http://localhost:3000" },
    async request(path, { method = "GET", body } = {}) {
      if (path === "/api/admin/telegram/autopost/settings") return { globalEnabled };
      const [, e, id] = path.match(/^\/api\/admin\/church-content\/([^/]+)(?:\/([^/]+))?$/) ?? [];
      const entity = e === "calendar-days" ? "calendar" : e;
      const rows = data[entity];
      if (!rows) throw new Error("Not found");
      if (method === "GET") return structuredClone(id ? rows.find((r) => r.id === id) : rows);
      writes++;
      if (throwWrite) throw new Error("Write outcome unknown");
      if (method === "POST") {
        const r = { ...body, id: "new-id", updatedAt: "1" };
        rows.push(r);
        return structuredClone(r);
      }
      const r = rows.find((r) => r.id === id);
      Object.assign(r, body);
      r.updatedAt = String(Number(r.updatedAt ?? 0) + 1);
      return structuredClone(r);
    },
  };
  const op = new Operator(api, store, { uploadRoots: [dir] });
  cleanups.push(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    op,
    store,
    data,
    dir,
    writeCount: () => writes,
    fail: () => {
      throwWrite = true;
    },
    enableAutopost: () => {
      globalEnabled = true;
    },
  };
}
const saint = {
  id: "saint-1",
  name: "Святий",
  slug: "saint",
  language: "uk",
  shortDescription: "Опис",
  biography: "Житіє",
  imageUrl: "",
  iconId: null,
  calendarDayId: null,
  status: "draft",
  updatedAt: "1",
};
const day = {
  id: "day-1",
  title: "День",
  slug: "day",
  language: "uk",
  dateNewStyle: "2026-09-10",
  dateOldStyle: "2026-08-28",
  description: "Опис",
  history: "Історія",
  seoTitle: "День",
  seoDescription: "Опис дня",
  status: "draft",
  updatedAt: "1",
};
const sources = ["https://example.org/reviewed-source"];
test("proposals are local and preserve before version without writes", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  const c = await t.op.prepare(
    "saints",
    "saint-1",
    { biography: "Нова редакція" },
    "Редакція",
    sources,
  );
  assert.equal(t.writeCount(), 0);
  assert.equal(c.before.biography, "Житіє");
  assert.equal(c.status, "proposed");
});
test("draft apply reads back and repeated apply is refused", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  const c = await t.op.prepare("saints", "saint-1", { biography: "Нова" }, "Редакція", sources);
  const r = await t.op.apply(c.id);
  assert.equal(r.verified, true);
  await assert.rejects(t.op.apply(c.id));
  assert.equal(t.writeCount(), 1);
});
test("published record cannot be changed through draft tool", async () => {
  const t = setup();
  t.data.saints.push({ ...saint, status: "published" });
  const c = await t.op.prepare("saints", "saint-1", { biography: "Нова" }, "Редакція", sources);
  await assert.rejects(t.op.apply(c.id), /Published content/);
  assert.equal(t.writeCount(), 0);
});
test("explicit publication applies reviewed proposal and requires exact change ID", async () => {
  const t = setup();
  t.data.saints.push({ ...saint, status: "published" });
  const c = await t.op.prepare("saints", "saint-1", { biography: "Нова" }, "Редакція", sources);
  await assert.rejects(t.op.apply(c.id, { publish: true, confirmation: "yes" }));
  const r = await t.op.apply(c.id, { publish: true, confirmation: `PUBLISH ${c.id}` });
  assert.equal(r.published, true);
});
test("publication without source references is refused", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  const c = await t.op.prepare("saints", "saint-1", {}, "Publish", []);
  await assert.rejects(
    t.op.apply(c.id, { publish: true, confirmation: `PUBLISH ${c.id}` }),
    /source/,
  );
  assert.equal(t.writeCount(), 0);
});
test("changed source invalidates proposal before write", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  const c = await t.op.prepare("saints", "saint-1", { biography: "Нова" }, "Редакція", sources);
  t.data.saints[0].biography = "Ручна";
  await assert.rejects(t.op.apply(c.id), /Source changed/);
  assert.equal(t.writeCount(), 0);
});
test("unknown write outcome cannot be retried", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  const c = await t.op.prepare("saints", "saint-1", { biography: "Нова" }, "Редакція", sources);
  t.fail();
  await assert.rejects(t.op.apply(c.id));
  assert.equal(t.store.get(c.id).status, "uncertain");
  await assert.rejects(t.op.apply(c.id));
  assert.equal(t.writeCount(), 1);
});
test("new record is draft and can be found after readback", async () => {
  const t = setup();
  const c = await t.op.prepare(
    "saints",
    null,
    { name: "Святий", slug: "new", language: "uk" },
    "Create",
    sources,
  );
  const r = await t.op.apply(c.id);
  assert.equal(r.entityId, "new-id");
  assert.equal(t.data.saints[0].status, "draft");
});
test("cross-language relationships are rejected", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  t.data.calendar.push({ ...day, language: "en" });
  await assert.rejects(
    t.op.prepare("saints", "saint-1", { calendarDayId: "day-1" }, "Link", sources),
    /language mismatch/,
  );
});
test("real reference IDs must exist", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  await assert.rejects(
    t.op.prepare("saints", "saint-1", { calendarDayId: "missing" }, "Link", sources),
    /Unexpected entity/,
  );
});
test("active autonomous Telegram blocks draft calendar writes", async () => {
  const t = setup();
  t.data.calendar.push({ ...day });
  t.enableAutopost();
  const c = await t.op.prepare("calendar", "day-1", { history: "Нова" }, "Edit", sources);
  await assert.rejects(t.op.apply(c.id), /Telegram/);
  assert.equal(t.writeCount(), 0);
});
test("disabled autopost allows calendar draft and computes dates", async () => {
  const t = setup();
  t.data.calendar.push({ ...day });
  const c = await t.op.prepare(
    "calendar",
    "day-1",
    { dateNewStyle: "2026-09-11" },
    "Move",
    sources,
  );
  await t.op.apply(c.id);
  assert.equal(t.data.calendar[0].dateOldStyle, "2026-08-29");
});
test("plugin-wide claims prevent overlapping processes", () => {
  const t = setup();
  const a = t.store.add({ entity: "saints" }),
    b = t.store.add({ entity: "saints" });
  t.store.claim(a.id);
  assert.throws(() => t.store.claim(b.id));
  t.store.release(a.id);
});
test("restore stages old content without immediately writing", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  const c = await t.op.prepare("saints", "saint-1", { biography: "Нова" }, "Edit", sources);
  await t.op.apply(c.id);
  const undo = await t.op.restoreProposal(c.id);
  assert.equal(undo.patch.biography, "Житіє");
  assert.equal(t.writeCount(), 1);
});
test("published slug changes are rejected", async () => {
  const t = setup();
  t.data.saints.push({ ...saint, status: "published" });
  await assert.rejects(
    t.op.prepare("saints", "saint-1", { slug: "other" }, "Edit", sources),
    /redirect/,
  );
});
test("duplicate language slug is rejected", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  await assert.rejects(
    t.op.prepare(
      "saints",
      null,
      { name: "Other", slug: "saint", language: "uk" },
      "Create",
      sources,
    ),
    /Duplicate/,
  );
});
test("image context uses actual date relationships, no generation", async () => {
  const t = setup();
  t.data.calendar.push({ ...day });
  t.data.saints.push({ ...saint, calendarDayId: "day-1" });
  const r = await t.op.imageBrief("2026-09-10", "uk");
  assert.equal(r.saints[0].id, "saint-1");
  assert.equal(t.writeCount(), 0);
});
test("image upload refuses non-image file and unsupported entity", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  const path = join(t.dir, "fake.png");
  writeFileSync(path, "not an actual image file");
  await assert.rejects(t.op.uploadImage(path, "saints", "saint-1", "manual"), /Only PNG/);
  await assert.rejects(t.op.uploadImage(path, "gospel", "anything", "manual"));
  assert.equal(t.writeCount(), 0);
});
test("scope prevents status, 3D settings and arbitrary fields in patches", () => {
  for (const patch of [
    { status: "published" },
    { particleCountDesktop: 1 },
    { isGlobal: true },
    { constructor: "bad" },
  ])
    assert.throws(() => normalizePatch("prayers", patch));
  assert.throws(() => entityPath("orders"));
  assert.throws(() => entityPath("saints", "../settings"));
});
test("date validation handles leap day and boundary", () => {
  assert.equal(julianDate("2024-02-29"), "2024-02-16");
  assert.equal(julianDate("2026-01-01"), "2025-12-19");
  assert.throws(() => julianDate("2026-02-29"));
  assert.throws(() =>
    normalizePatch("calendar", { dateNewStyle: "2026-09-10", dateOldStyle: "2026-08-27" }),
  );
});
test("year coverage distinguishes empty leap-year dates and publication", () => {
  const c = coverage({ calendar: [day] }, 2024);
  assert.equal(c.totalDays, 366);
  assert.equal(c.presentDays, 0);
  const r = coverage({ calendar: [day] }, 2026);
  assert.equal(r.presentDays, 1);
  assert.equal(r.publishedDays, 0);
});
test("audit detects actual relation break and date mismatch", () => {
  const d = {
    saints: [{ ...saint, calendarDayId: "missing" }],
    calendar: [{ ...day, dateOldStyle: "2026-01-01" }],
  };
  assert.equal(relations(d).issues[0].code, "broken_relation");
  assert.ok(audit(d).issues.some((i) => i.code === "date_pair_mismatch"));
});
test("transport does not expose service errors or follow redirects and forbids non-editorial writes", async () => {
  let called = 0;
  const api = new AdminApi(
    { origin: "https://example.test", token: "SECRET" },
    async (url, options) => {
      called++;
      assert.equal(options.redirect, "error");
      return new Response("SECRET server details", { status: 401 });
    },
  );
  await assert.rejects(
    api.request("/api/admin/church-content/saints"),
    /^Error: Administrative API HTTP 401$/,
  );
  for (const path of [
    "/api/admin/auth/login",
    "/api/admin/telegram/posts",
    "/api/admin/church-content/visualizer-models",
    "/api/admin/church-content/saints/../info",
  ])
    await assert.rejects(api.request(path, { method: "POST", body: {} }));
  await assert.rejects(
    api.request("/api/admin/telegram/autopost/settings", {
      method: "PUT",
      body: { globalEnabled: false },
    }),
  );
  assert.equal(called, 1);
});
test("transport refuses DELETE and returns uncertainty after network failure", async () => {
  const api = new AdminApi({ origin: "https://example.test", token: "SECRET" }, async () => {
    throw new Error("SECRET");
  });
  await assert.rejects(api.request(entityPath("saints"), { method: "DELETE" }), /method/);
  await assert.rejects(
    api.request(entityPath("saints"), { method: "POST", body: {} }),
    /outcome unknown/,
  );
});
test("uncertain write blocks other writes until reconciled", async () => {
  const t = setup();
  t.data.saints.push({ ...saint }, { ...saint, id: "saint-2", slug: "saint-2" });
  const a = await t.op.prepare("saints", "saint-1", { biography: "A" }, "Edit", sources);
  const b = await t.op.prepare("saints", "saint-2", { biography: "B" }, "Edit", sources);
  t.fail();
  await assert.rejects(t.op.apply(a.id));
  await assert.rejects(t.op.apply(b.id), /busy/);
  assert.equal(t.writeCount(), 1);
});
test("reconcile identifies committed write after interrupted readback", async () => {
  const t = setup();
  t.data.saints.push({ ...saint });
  const c = await t.op.prepare("saints", "saint-1", { biography: "Нова" }, "Edit", sources);
  t.store.claim(c.id);
  const expected = { biography: "Нова", status: "draft" };
  t.store.set(c.id, "uncertain", { ...c, expected, savedId: "saint-1" });
  Object.assign(t.data.saints[0], expected);
  const r = await t.op.reconcile(c.id);
  assert.equal(r.verified, true);
  assert.equal(t.store.get(c.id).status, "applied");
  assert.equal(t.writeCount(), 0);
});
test("uploaded image only stages attachment and records honest AI provenance", async () => {
  const t = setup();
  t.data.calendar.push({ ...day, status: "published" });
  const path = join(t.dir, "image.png");
  writeFileSync(
    path,
    Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(12)]),
  );
  const original = t.op.api.request;
  t.op.api.request = async (p, a) =>
    p === "/api/admin/media/upload"
      ? { key: "media/calendar/day-1/main/photo.png", url: "https://example.test/photo.png" }
      : original(p, a);
  const r = await t.op.uploadImage(path, "calendar", "day-1", "ai_generated");
  assert.equal(r.attached, false);
  assert.equal(r.published, false);
  assert.deepEqual(t.store.get(r.changeId).patch.imageMetadata, {
    origin: "ai_generated",
    identityVerified: false,
  });
  assert.equal(t.writeCount(), 0);
});
