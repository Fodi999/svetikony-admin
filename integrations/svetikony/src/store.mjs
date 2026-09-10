import { mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
export function hash(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)) ?? "undefined")
    .digest("hex");
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export class Store {
  constructor(dir, origin) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    chmodSync(dir, 0o700);
    const file = join(dir, "operator.sqlite");
    this.db = new DatabaseSync(file);
    chmodSync(file, 0o600);
    this.origin = origin;
    this.db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS changes(id TEXT PRIMARY KEY,origin TEXT NOT NULL,status TEXT NOT NULL,body TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,origin TEXT NOT NULL,created_at TEXT NOT NULL,action TEXT NOT NULL,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS operation_lock(origin TEXT PRIMARY KEY,change_id TEXT NOT NULL);`);
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS terrain_lease(origin TEXT PRIMARY KEY, validation_id TEXT NOT NULL, token TEXT NOT NULL, expires INTEGER NOT NULL)",
    );
  }
  add(body) {
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO changes VALUES(?,?,?,?,?)")
      .run(id, this.origin, "proposed", JSON.stringify(body), new Date().toISOString());
    return this.get(id);
  }
  get(id) {
    const row = this.db
      .prepare("SELECT * FROM changes WHERE id=? AND origin=?")
      .get(id, this.origin);
    if (!row) throw new Error("Change not found in this environment");
    return { ...JSON.parse(row.body), id: row.id, status: row.status, updatedAt: row.updated_at };
  }
  findVisualizerRequest(requestId) {
    const row = this.db
      .prepare(
        "SELECT id FROM changes WHERE origin=? AND json_extract(body,'$.scope')='visualizer' AND json_extract(body,'$.requestId')=?",
      )
      .get(this.origin, requestId);
    return row ? this.get(row.id) : null;
  }
  list() {
    return this.db
      .prepare(
        "SELECT id,status,updated_at FROM changes WHERE origin=? ORDER BY updated_at DESC LIMIT 100",
      )
      .all(this.origin);
  }
  set(id, status, body) {
    this.db
      .prepare("UPDATE changes SET status=?,body=?,updated_at=? WHERE id=? AND origin=?")
      .run(status, JSON.stringify(body), new Date().toISOString(), id, this.origin);
  }
  event(action, body) {
    this.db
      .prepare("INSERT INTO events(origin,created_at,action,body) VALUES(?,?,?,?)")
      .run(this.origin, new Date().toISOString(), action, JSON.stringify(body));
  }
  events() {
    return this.db
      .prepare("SELECT created_at,action,body FROM events WHERE origin=? ORDER BY id DESC LIMIT 50")
      .all(this.origin)
      .map((r) => ({ ...r, body: JSON.parse(r.body) }));
  }
  claim(id) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (this.get(id).status !== "proposed")
        throw new Error("Change is not proposed; no automatic replay");
      this.db.prepare("INSERT INTO operation_lock VALUES(?,?)").run(this.origin, id);
      this.db
        .prepare("UPDATE changes SET status='applying' WHERE id=? AND origin=?")
        .run(id, this.origin);
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw new Error(
        "Change is busy, already processed, or a previous operation needs reconciliation",
      );
    }
  }
  release(id) {
    this.db
      .prepare("DELETE FROM operation_lock WHERE origin=? AND change_id=?")
      .run(this.origin, id);
  }
  close() {
    this.db.close();
  }
  claimTerrain(id) {
    const token = randomUUID(),
      now = Date.now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("DELETE FROM terrain_lease WHERE origin=? AND expires<?")
        .run(this.origin, now);
      this.db
        .prepare("INSERT INTO terrain_lease VALUES(?,?,?,?)")
        .run(this.origin, id, token, now + 300000);
      this.db.exec("COMMIT");
      return token;
    } catch {
      this.db.exec("ROLLBACK");
      throw new Error("Another terrain transfer is active; reconcile after it finishes");
    }
  }
  heartbeatTerrain(id, token) {
    const result = this.db
      .prepare("UPDATE terrain_lease SET expires=? WHERE origin=? AND validation_id=? AND token=?")
      .run(Date.now() + 300000, this.origin, id, token);
    if (!result.changes) throw new Error("Terrain lease lost; stop and reconcile");
  }
  releaseTerrain(id, token) {
    this.db
      .prepare("DELETE FROM terrain_lease WHERE origin=? AND validation_id=? AND token=?")
      .run(this.origin, id, token);
  }
}
