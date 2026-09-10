import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { setup, event, glb } from "./helpers/visualizer.mjs";
import { validateGlb, readGlb, MAX_GLB_BYTES } from "../src/visualizer-glb.mjs";
const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
});
function fixture() {
  const s = setup();
  cleanup.push(() => s.close());
  return s;
}
const create = (s, overrides = {}) =>
  s.op.create({ requestId: randomUUID(), event: { ...event, ...overrides } });
const upload = (s) => s.op.upload({ requestId: randomUUID(), path: s.path, title: "Fixture" });
test("create/update draft readback and same-request replay never duplicate writes", async () => {
  const s = fixture();
  const requestId = randomUUID();
  const a = await s.op.create({ requestId, event });
  assert.equal(a.result.event.status, "draft");
  assert.equal(a.verified, true);
  const b = await s.op.create({ requestId, event });
  assert.equal(b.replayed, true);
  assert.equal(s.writes.length, 1);
  await assert.rejects(
    s.op.create({ requestId, event: { ...event, title: "Different" } }),
    /different input/,
  );
  const c = await s.op.update({
    requestId: randomUUID(),
    id: a.result.event.id,
    patch: { title: "Updated" },
  });
  assert.equal(c.result.event.title, "Updated");
  assert.equal(c.result.event.translationGroupId, a.result.event.translationGroupId);
});
test("input validation rejects publication, invented fields, bad coordinates, chronology and identity changes", async () => {
  const s = fixture();
  for (const patch of [
    { status: "published" },
    { status: "archived" },
    { latitude: 91 },
    { longitude: -181 },
    { yearStart: 0 },
    { yearStart: 3.5 },
    { yearStart: 988, yearEnd: 987 },
    { latitude: null },
    { translationGroupId: "forged" },
    { eventType: "invented" },
  ])
    await assert.rejects(create(s, patch));
  assert.equal(s.writes.length, 0);
  const a = await create(s);
  for (const patch of [{ slug: "other" }, { language: "ru" }, { status: "published" }])
    await assert.rejects(s.op.update({ requestId: randomUUID(), id: a.result.event.id, patch }));
  s.events[0].status = "published";
  await assert.rejects(
    s.op.update({ requestId: randomUUID(), id: s.events[0].id, patch: { title: "x" } }),
    /draft/,
  );
});
test("BC period validation matches existing chronology semantics", async () => {
  const s = fixture();
  await create(s, { calendarEra: "BC", yearStart: 100, yearEnd: 50 });
  await assert.rejects(
    create(s, { slug: "bad-bc", calendarEra: "BC", yearStart: 50, yearEnd: 100 }),
    /Period/,
  );
});
test("UK RU EN share actual group, require explicit anchor and skip duplicates", async () => {
  const s = fixture();
  const uk = (await create(s)).result.event;
  await assert.rejects(create(s, { language: "ru" }), /translationOf/);
  for (const language of ["ru", "en"]) {
    const r = await s.op.create({
      requestId: randomUUID(),
      translationOf: uk.id,
      event: { ...event, language, title: language },
    });
    assert.equal(r.result.event.translationGroupId, uk.translationGroupId);
  }
  assert.equal((await s.op.detail(uk.id)).translations.length, 3);
  await assert.rejects(
    s.op.create({
      requestId: randomUUID(),
      translationOf: uk.id,
      event: { ...event, language: "ru" },
    }),
    /already exists/,
  );
  await assert.rejects(
    s.op.create({
      requestId: randomUUID(),
      translationOf: uk.id,
      event: { ...event, slug: "other", language: "en" },
    }),
    /same slug/,
  );
  assert.equal(s.events.length, 3);
});
test("wrong backend translation group is unresolved, not reported as success", async () => {
  const s = fixture();
  const uk = (await create(s)).result.event;
  s.faults.wrongGroup = true;
  await assert.rejects(
    s.op.create({
      requestId: randomUUID(),
      translationOf: uk.id,
      event: { ...event, language: "ru" },
    }),
    /Translation group mismatch/,
  );
  assert.equal(s.store.list()[0].status, "uncertain");
});
test("lost create response is reconciled by readback and cannot replay", async () => {
  const s = fixture();
  s.faults.throwAfterWrite = true;
  const requestId = randomUUID();
  await assert.rejects(s.op.create({ requestId, event }), /uncertain/);
  await assert.rejects(s.op.create({ requestId, event }), /reconcile/);
  s.faults.throwAfterWrite = false;
  const c = s.store.findVisualizerRequest(requestId);
  const result = await s.op.reconcile({ operationId: c.id });
  assert.equal(result.verified, true);
  assert.equal(s.events.length, 1);
});
test("GLB validation rejects broken headers, JSON, chunks, external resources, extension, MIME, oversized files and escaped roots", () => {
  const s = fixture();
  validateGlb(glb());
  for (const bytes of [
    Buffer.alloc(0),
    Buffer.from("not a model"),
    glb({ asset: { version: "1.0" } }),
    glb({ asset: { version: "2.0" }, images: [{ uri: "https://remote/image.png" }] }),
    glb({ asset: { version: "2.0" }, buffers: [{ uri: "../data.bin" }] }),
  ])
    assert.throws(() => validateGlb(bytes));
  const broken = glb();
  broken.writeUInt32LE(3, 4);
  assert.throws(() => validateGlb(broken));
  const wrongLength = glb();
  wrongLength.writeUInt32LE(12, 8);
  assert.throws(() => validateGlb(wrongLength));
  const wrongChunk = glb();
  wrongChunk.writeUInt32LE(1, 12);
  assert.throws(() => validateGlb(wrongChunk));
  const invalidJson = glb();
  invalidJson[20] = 0;
  assert.throws(() => validateGlb(invalidJson));
  assert.throws(() => validateGlb(Buffer.alloc(MAX_GLB_BYTES + 1)));
  assert.throws(() => readGlb(s.path, [s.dir], "image/png"), /MIME/);
  const fake = join(s.dir, "model.txt");
  writeFileSync(fake, glb());
  assert.throws(() => readGlb(fake, [s.dir]), /extension/);
  const link = join(s.dir, "escape.glb");
  symlinkSync("/etc/hosts", link);
  assert.throws(() => readGlb(link, [s.dir]), /outside/);
  assert.equal(readGlb(s.path, [s.dir], "application/octet-stream").mimeType, "model/gltf-binary");
});
test("upload maps existing multipart pipeline to R2 and registers independently verified metadata", async () => {
  const s = fixture();
  const result = (await upload(s)).result;
  assert.match(result.r2Key, /^media\/visualizer\//);
  assert.equal(result.mimeType, "model/gltf-binary");
  assert.equal(result.filename, "sample.glb");
  assert.match(result.url, /^http:\/\/localhost:3000\/media\//);
  assert.equal(result.model.eventGroupId, null);
  assert.equal(result.model.isBaseEarth, false);
  assert.equal(result.size, glb().length);
  assert.equal(s.files.size, 1);
  assert.equal(s.models.length, 1);
  assert.equal(s.writes.length, 2);
});
test("wrong upload mapping is blocked before metadata registration", async () => {
  const s = fixture();
  s.faults.wrongUpload = true;
  await assert.rejects(upload(s), /mapping/);
  assert.equal(s.models.length, 0);
});
test("R2 MIME/size mismatch blocks metadata registration and preserves uncertain key", async () => {
  const s = fixture();
  s.faults.mediaMime = "text/html";
  await assert.rejects(upload(s), /MIME/);
  assert.equal(s.models.length, 0);
  assert.equal(s.files.size, 1);
  assert.ok(s.store.get(s.store.list()[0].id).uploaded.key);
});
test("model attachment verifies group and all language siblings", async () => {
  const s = fixture();
  const uk = (await create(s)).result.event;
  await s.op.create({
    requestId: randomUUID(),
    translationOf: uk.id,
    event: { ...event, language: "ru" },
  });
  const m = (await upload(s)).result.model;
  const result = await s.op.attach({ requestId: randomUUID(), modelId: m.id, eventId: uk.id });
  assert.equal(result.result.model.eventGroupId, uk.translationGroupId);
  assert.equal(result.result.translations.length, 2);
  assert.equal((await s.op.detail(uk.id)).models[0].id, m.id);
});
test("attachment rejects published siblings, Base Earth and models belonging to another group", async () => {
  const s = fixture();
  const e = (await create(s)).result.event;
  const m = (await upload(s)).result.model;
  s.events[0].status = "published";
  await assert.rejects(
    s.op.attach({ requestId: randomUUID(), modelId: m.id, eventId: e.id }),
    /drafts/,
  );
  s.events[0].status = "draft";
  s.models[0].isBaseEarth = true;
  await assert.rejects(
    s.op.attach({ requestId: randomUUID(), modelId: m.id, eventId: e.id }),
    /Base Earth/,
  );
  s.models[0].isBaseEarth = false;
  s.models[0].eventGroupId = "other";
  await assert.rejects(
    s.op.attach({ requestId: randomUUID(), modelId: m.id, eventId: e.id }),
    /another group/,
  );
});
test("wrong attachment readback is uncertain", async () => {
  const s = fixture();
  const e = (await create(s)).result.event;
  const m = (await upload(s)).result.model;
  s.faults.wrongAttach = true;
  await assert.rejects(
    s.op.attach({ requestId: randomUUID(), modelId: m.id, eventId: e.id }),
    /relationship mismatch/,
  );
});
test("Base Earth requires reviewed exact confirmation and retains old model and bytes", async () => {
  const s = fixture();
  const old = (await upload(s)).result.model;
  const next = (await upload(s)).result.model;
  s.models[0].isBaseEarth = true;
  const proposal = await s.op.prepareBase({ modelId: next.id });
  const count = s.writes.length;
  assert.equal(proposal.CURRENT_BASE_EARTH.id, old.id);
  assert.equal(proposal.FILE_SIZE, next.fileSize);
  await assert.rejects(
    s.op.setBase({ proposalId: proposal.proposalId, confirmation: "yes" }),
    /confirmation/,
  );
  assert.equal(s.writes.length, count);
  const r = await s.op.setBase({
    proposalId: proposal.proposalId,
    confirmation: proposal.confirmation,
  });
  assert.equal(r.result.model.id, next.id);
  assert.equal(s.models.length, 2);
  assert.equal(s.files.size, 2);
  assert.equal(s.models[0].isBaseEarth, false);
  await assert.rejects(
    s.op.setBase({ proposalId: proposal.proposalId, confirmation: proposal.confirmation }),
  );
});
test("stale and expired Base Earth proposals cannot apply", async () => {
  const s = fixture();
  const next = (await upload(s)).result.model;
  const p = await s.op.prepareBase({ modelId: next.id });
  s.models[0].title = "changed";
  await assert.rejects(
    s.op.setBase({ proposalId: p.proposalId, confirmation: p.confirmation }),
    /changed since preview/,
  );
  const fresh = await s.op.prepareBase({ modelId: next.id });
  const raw = s.store.get(fresh.proposalId);
  s.store.set(raw.id, "proposed", { ...raw, expiresAt: 0 });
  await assert.rejects(
    s.op.setBase({ proposalId: fresh.proposalId, confirmation: fresh.confirmation }),
    /fresh/,
  );
  assert.ok(!s.writes.some((w) => w.path.endsWith("set-base-earth")));
});
test("LOCAL guard rejects production and spoofed environment before reading or writing", async () => {
  const s = fixture();
  s.config.origin = "https://svetikony.com";
  await assert.rejects(s.op.events(), /LOCAL/);
  await assert.rejects(create(s), /LOCAL/);
  await assert.rejects(upload(s), /LOCAL/);
  assert.equal(s.writes.length, 0);
});
test("transport refuses delete, publish endpoints, traversal, arbitrary media and bearer-bearing public requests", async () => {
  const s = fixture();
  await assert.rejects(
    s.api.request("/api/admin/church-content/visualizer-events/e", { method: "DELETE" }),
  );
  await assert.rejects(
    s.api.request("/api/admin/church-content/visualizer-events/e/publish", { method: "POST" }),
  );
  await assert.rejects(
    s.api.request("/api/admin/church-content/visualizer-events/e", {
      method: "PUT",
      body: { status: "published" },
    }),
  );
  await assert.rejects(s.api.modelMedia("../secret"));
  await assert.rejects(s.api.publicJson("https://remote.example"));
  assert.equal(s.writes.length, 0);
});

test("lost metadata response reconciles upload without a second R2 upload", async () => {
  const s = fixture();
  s.faults.throwAfterWrite = true;
  const requestId = randomUUID();
  await assert.rejects(s.op.upload({ requestId, path: s.path }), /uncertain/);
  const receipt = s.store.findVisualizerRequest(requestId);
  assert.equal(s.files.size, 1);
  assert.equal(s.models.length, 1);
  s.faults.throwAfterWrite = false;
  const result = await s.op.reconcile({ operationId: receipt.id });
  assert.equal(result.verified, true);
  assert.equal(s.writes.filter((w) => w.path.endsWith("/upload")).length, 1);
});
test("lost Base Earth response requires read reconciliation, never repeats switch", async () => {
  const s = fixture();
  const m = (await upload(s)).result.model;
  const p = await s.op.prepareBase({ modelId: m.id });
  s.faults.throwAfterWrite = true;
  await assert.rejects(
    s.op.setBase({ proposalId: p.proposalId, confirmation: p.confirmation }),
    /no automatic replay/,
  );
  s.faults.throwAfterWrite = false;
  assert.equal((await s.op.reconcile({ operationId: p.proposalId })).verified, true);
  assert.equal(s.writes.filter((w) => w.path.endsWith("/set-base-earth")).length, 1);
});
test("reconciliation cannot release a still-running operation lock", async () => {
  const s = fixture();
  const c = s.store.add({ scope: "visualizer", kind: "create_event", startedAt: Date.now() });
  s.store.claim(c.id);
  await assert.rejects(s.op.reconcile({ operationId: c.id }), /still be running/);
  assert.equal(s.store.get(c.id).status, "applying");
});
