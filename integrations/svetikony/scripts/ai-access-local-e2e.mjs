// LOCAL ONLY. Creates a disposable local human-session equivalent and harmless draft.
// Never reads browser cookies or logs credentials, pairing codes, or raw MCP responses.
import { DatabaseSync } from "node:sqlite";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir, homedir } from "node:os";
const readOnlyTest = process.argv.includes("--read-only-revocation");
const backend = resolve(homedir(), "Desktop/svet-ikony"),
  admin = "http://localhost:3001",
  dbdir = join(backend, ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
const paths = readdirSync(dbdir)
  .filter((x) => x.endsWith(".sqlite"))
  .filter((x) => {
    const probe = new DatabaseSync(join(dbdir, x), { readOnly: true });
    try {
      return !!probe.prepare("SELECT name FROM sqlite_master WHERE name='ai_access_grants'").get();
    } finally {
      probe.close();
    }
  });
if (paths.length !== 1) throw Error("Expected exactly one LOCAL D1 database");
const db = new DatabaseSync(join(dbdir, paths[0]));
db.exec("PRAGMA busy_timeout=5000");
const userId = randomUUID(),
  sessionId = randomUUID(),
  session = randomBytes(32).toString("base64url"),
  createdAt = new Date().toISOString(),
  expiresAt = new Date(Date.now() + 600000).toISOString();
db.prepare(
  "INSERT INTO admin_users(id,email,name,password_hash,role,active,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)",
).run(
  userId,
  "ai-local-" + userId + "@example.invalid",
  "LOCAL AI access verification",
  "disabled-password-login",
  "super_admin",
  createdAt,
  createdAt,
);
db.prepare(
  "INSERT INTO admin_sessions(id,user_id,token_hash,created_at,expires_at) VALUES(?,?,?,?,?)",
).run(sessionId, userId, createHash("sha256").update(session).digest("hex"), createdAt, expiresAt);
const dir = mkdtempSync(join(tmpdir(), "ai-delegated-e2e-"));
let grantId;
const report = { environment: "LOCAL", productionWrites: 0 };
const client = new Client({ name: "local-delegated-e2e", version: "1" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(import.meta.dirname, "../dist/server.mjs")],
  env: {
    ...process.env,
    SVETIKONY_ENV_FILE: join(homedir(), "Desktop/svetikony-admin/.env.local"),
    SVETIKONY_API_ORIGIN: "http://localhost:3000",
    SVETIKONY_STATE_DIR: dir,
    SVETIKONY_READ_ONLY: "true",
  },
  stderr: "pipe",
});
transport.stderr?.on("data", () => {});
async function bff(path, body) {
  const r = await fetch(admin + "/api/bff/ai-access/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      cookie: "admin_session=" + session,
      Origin: admin,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
  });
  if (!r.ok) throw Error("LOCAL BFF " + path.split("/")[0] + " HTTP " + r.status);
  return r.json();
}
async function call(name, args = {}) {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw Error("MCP " + name + " failed");
  return JSON.parse(r.content[0].text).result;
}
try {
  const denied = await fetch(admin + "/api/bff/ai-access/grants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  report.unauthenticatedDenied = [401, 403].includes(denied.status);
  const g = await bff("grants", {
    mode: readOnlyTest ? "READ_ONLY" : "DRAFT_EDIT",
    modules: ["calendar", "prayers"],
    durationMinutes: 15,
  });
  grantId = g.id;
  report.grantCreated = true;
  await client.connect(transport);
  report.tools = (await client.listTools()).tools.length;
  report.connected = (await call("connect_ai_access", { pairingCode: g.pairingCode })).connected;
  const days = await call("list_content", { entity: "calendar", limit: 1 });
  report.calendarRead = true;
  report.calendarCount = days.total;
  if (!readOnlyTest) {
    const slug = "local-ai-access-" + randomUUID();
    const change = await call("prepare_change", {
      entity: "prayers",
      id: null,
      patch: {
        title: "LOCAL AI delegated access verification",
        slug,
        text: "Technical local draft. Not religious content. Do not publish.",
        language: "uk",
      },
      reason: "User-authorized LOCAL end-to-end test",
      sources: [],
    });
    const applied = await call("apply_draft", { changeId: change.id });
    report.draftApplied = !!applied;
    const drafts = await call("list_content", { entity: "prayers", query: slug, limit: 1 });
    report.draftVerified = drafts.items?.length === 1 && drafts.items[0].status === "draft";
    report.localDraftId = drafts.items?.[0]?.id;
  }
  const log = await bff("activity");
  report.activityRecorded = log.some(
    (x) =>
      x.module === (readOnlyTest ? "calendar" : "prayers") &&
      x.operation === (readOnlyTest ? "read" : "create") &&
      x.status === "success",
  );
  await bff("grants/" + grantId + "/revoke", {});
  const revoked = await client.callTool({
    name: "list_content",
    arguments: { entity: "calendar", limit: 1 },
  });
  report.revocationImmediate = !!revoked.isError;
  console.log(JSON.stringify(report, null, 2));
  if (
    (!readOnlyTest && !report.draftVerified) ||
    !report.activityRecorded ||
    !report.revocationImmediate
  )
    throw Error("LOCAL E2E verification failed");
} finally {
  if (grantId)
    try {
      await bff("grants/" + grantId + "/revoke", {});
    } catch {}
  await client.close();
  db.prepare("UPDATE admin_sessions SET revoked_at=? WHERE id=?").run(
    new Date().toISOString(),
    sessionId,
  );
  db.prepare("UPDATE admin_users SET active=0 WHERE id=?").run(userId);
  db.close();
  console.log(
    JSON.stringify({
      retainedArtifactDirectory: dir,
      localTestGrantId: grantId,
      localFixtureUserId: userId,
    }),
  );
}
