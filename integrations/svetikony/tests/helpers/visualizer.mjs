import { randomUUID, createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../src/store.mjs";
import { AdminApi } from "../../src/transport.mjs";
import { Visualizer } from "../../src/visualizer.mjs";
export function glb(doc = { asset: { version: "2.0" }, scenes: [{ nodes: [] }], scene: 0 }) {
  const json = Buffer.from(JSON.stringify(doc));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32);
  json.copy(padded);
  const bytes = Buffer.alloc(20 + padded.length);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(padded.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(bytes, 20);
  return bytes;
}
export function setup() {
  const dir = mkdtempSync(join(tmpdir(), "visualizer-test-"));
  const config = { origin: "http://localhost:3000", environment: "local", token: "test-only" };
  const store = new Store(dir, config.origin);
  const events = [];
  const models = [];
  const files = new Map();
  const writes = [];
  const faults = {
    throwAfterWrite: false,
    wrongGroup: false,
    mediaMime: null,
    mediaSize: null,
    wrongAttach: false,
    wrongUpload: false,
  };
  const fetcher = async (url, options = {}) => {
    const u = new URL(url);
    const path = u.pathname;
    const method = options.method ?? "GET";
    if (path.startsWith("/media/")) {
      if (options.headers?.Authorization) throw new Error("Credential leaked to public media");
      const f = files.get(path.slice(1));
      if (!f) return new Response(null, { status: 404 });
      return new Response(method === "HEAD" ? null : f.bytes, {
        headers: {
          "content-length": String(faults.mediaSize ?? f.bytes.length),
          "content-type": faults.mediaMime ?? "model/gltf-binary",
          etag: '"' + f.etag + '"',
        },
      });
    }
    if (path === "/api/church/visualizer-models/base-earth")
      return Response.json(models.find((m) => m.isBaseEarth) ?? null);
    if (path === "/api/church/visualizer-events")
      return Response.json(events.filter((e) => e.status === "published"));
    if (path === "/api/admin/media/upload") {
      writes.push({ path, method });
      const form = options.body;
      const file = form.get("file");
      const bytes = Buffer.from(await file.arrayBuffer());
      const key = `media/${form.get("module")}/${form.get("entityId")}/${form.get("purpose")}/${randomUUID()}.glb`;
      const etag = createHash("md5").update(bytes).digest("hex");
      files.set(key, { bytes, filename: file.name, etag });
      const result = {
        key,
        url: "https://never-fetch-production.example/" + key,
        contentType: "model/gltf-binary",
        kind: "model",
        size: bytes.length,
        etag,
      };
      if (faults.wrongUpload) result.kind = "image";
      return Response.json(result, { status: 201 });
    }
    const match = path.match(
      /^\/api\/admin\/church-content\/visualizer-(events|models)(?:\/([^/]+))?(\/set-base-earth)?$/,
    );
    if (!match) return Response.json({ error: "not found" }, { status: 404 });
    const [, kind, id, setBase] = match;
    const rows = kind === "events" ? events : models;
    if (method === "GET") return Response.json(id ? (rows.find((r) => r.id === id) ?? null) : rows);
    writes.push({ path, method, body: options.body });
    const body = options.body ? JSON.parse(options.body) : {};
    let result;
    if (setBase) {
      for (const m of models) m.isBaseEarth = m.id === id;
      result = models.find((m) => m.id === id);
    } else if (method === "POST") {
      if (kind === "events") {
        result = {
          summary: "",
          description: "",
          eventType: "other",
          chronologyType: "unknown",
          era: "custom",
          calendarEra: "unknown",
          yearStart: null,
          yearEnd: null,
          century: null,
          displayDate: "",
          locationName: "",
          latitude: null,
          longitude: null,
          calendarDayId: null,
          isFeatured: false,
          publishedAt: null,
          ...body,
          id: randomUUID(),
          translationGroupId: faults.wrongGroup
            ? randomUUID()
            : (events.find((e) => e.slug === body.slug)?.translationGroupId ?? randomUUID()),
          updatedAt: "1",
        };
      } else {
        const f = files.get(body.r2Key);
        result = {
          eventGroupId: null,
          ...body,
          filename: f.filename,
          mimeType: "model/gltf-binary",
          fileSize: f.bytes.length,
          isBaseEarth: false,
          sortOrder: 0,
          id: randomUUID(),
          updatedAt: "1",
        };
      }
      rows.push(result);
    } else {
      result = rows.find((r) => r.id === id);
      Object.assign(result, body);
      result.updatedAt = String(Number(result.updatedAt) + 1);
      if (faults.wrongAttach) result.eventGroupId = null;
    }
    if (faults.throwAfterWrite) throw new Error("Lost response after write");
    return Response.json(result);
  };
  const api = new AdminApi(config, fetcher);
  const op = new Visualizer(api, store, { uploadRoots: [dir] });
  const path = join(dir, "sample.glb");
  writeFileSync(path, glb());
  return {
    op,
    api,
    store,
    dir,
    path,
    events,
    models,
    files,
    writes,
    faults,
    config,
    close() {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
export const event = {
  title: "Local test",
  slug: "local-test",
  language: "uk",
  eventType: "historical",
  chronologyType: "exact",
  era: "medieval",
  calendarEra: "AD",
  yearStart: 988,
  locationName: "Kyiv",
  latitude: 50.45,
  longitude: 30.52,
  status: "draft",
};
