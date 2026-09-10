// Explicit, LOCAL-only integration test. Keeps draft fixtures and operation receipts;
// never publishes, replaces Base Earth, deletes objects or switches environment.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { loadConfig, requireLocal, AdminApi } from "../src/transport.mjs";
if (!process.argv.includes("--write-local-smoke"))
  throw new Error("Explicit --write-local-smoke flag required");
const config = loadConfig();
requireLocal(config);
const directory = process.env.SVETIKONY_SMOKE_DIR;
if (!directory || existsSync(join(directory, "started.json")))
  throw new Error("Provide a new SVETIKONY_SMOKE_DIR; never replay an interrupted smoke");
mkdirSync(directory, { recursive: true });
const slug = "local-plugin-smoke-" + randomUUID();
writeFileSync(join(directory, "started.json"), JSON.stringify({ slug, origin: config.origin }));
// Self-contained triangle, clearly a test fixture rather than historical content.
const vertices = Buffer.alloc(36);
[-1, 0, 0, 1, 0, 0, 0, 1, 0].forEach((n, i) => vertices.writeFloatLE(n, i * 4));
const doc = {
  asset: { version: "2.0", generator: "Svetikony LOCAL integration fixture" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  buffers: [{ byteLength: 36 }],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [-1, 0, 0], max: [1, 1, 0] },
  ],
};
const json = Buffer.from(JSON.stringify(doc));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32);
json.copy(padded);
const glb = Buffer.alloc(20 + padded.length + 8 + vertices.length);
glb.writeUInt32LE(0x46546c67, 0);
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(padded.length, 12);
glb.writeUInt32LE(0x4e4f534a, 16);
padded.copy(glb, 20);
glb.writeUInt32LE(vertices.length, 20 + padded.length);
glb.writeUInt32LE(0x004e4942, 24 + padded.length);
vertices.copy(glb, 28 + padded.length);
const path = join(directory, "local-plugin-test.glb");
writeFileSync(path, glb);
const client = new Client({ name: "visualizer-local-smoke", version: "1" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve("dist/server.mjs")],
  env: {
    ...process.env,
    SVETIKONY_STATE_DIR: join(directory, "state"),
    SVETIKONY_UPLOAD_ROOTS: directory,
  },
  stderr: "pipe",
});
transport.stderr?.on("data", () => {});
const results = [];
async function call(name, args = {}) {
  const response = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
  const decoded = JSON.parse(response.content[0].text);
  results.push({ name, ...decoded });
  writeFileSync(join(directory, "results.json"), JSON.stringify(results, null, 2));
  if (response.isError) throw new Error("Smoke stopped at " + name + ": " + decoded.error);
  return decoded.result;
}
try {
  await client.connect(transport);
  const tools = (await client.listTools()).tools;
  const status = await call("connection_status");
  if (!status.connected) throw new Error("Backend unavailable");
  const before = await call("get_base_earth");
  const created = [];
  for (const language of ["uk", "ru", "en"]) {
    const result = await call("create_visualizer_event", {
      requestId: randomUUID(),
      ...(created.length ? { translationOf: created[0].id } : {}),
      event: {
        title: "LOCAL MCP smoke — " + language,
        slug,
        language,
        eventType: "other",
        chronologyType: "unknown",
        era: "custom",
        calendarEra: "unknown",
        status: "draft",
        summary: "Technical test fixture. Not historical content.",
      },
    });
    created.push(result.result.event);
  }
  await call("update_visualizer_event", {
    requestId: randomUUID(),
    id: created[0].id,
    patch: {
      summary: "LOCAL MCP smoke: create, translations, update, GLB and attachment verified.",
    },
  });
  const uploaded = await call("upload_visualizer_glb", {
    requestId: randomUUID(),
    path,
    title: "LOCAL MCP smoke triangle",
  });
  await call("attach_model_to_visualizer_event", {
    requestId: randomUUID(),
    modelId: uploaded.result.model.id,
    eventId: created[0].id,
  });
  for (const row of created) {
    const detail = await call("get_visualizer_event", { id: row.id });
    if (
      detail.event.status !== "draft" ||
      detail.translations.length !== 3 ||
      !detail.models.some((m) => m.id === uploaded.result.model.id)
    )
      throw new Error("Verification mismatch");
  }
  await call("list_visualizer_events", { status: "draft" });
  await call("list_visualizer_models", { eventGroupId: created[0].translationGroupId });
  const proposal = await call("prepare_base_earth_change", { modelId: uploaded.result.model.id }); // LOCAL proposal only; never apply.
  const after = await call("get_base_earth");
  if (after.model.id !== before.model.id) throw new Error("Base Earth changed unexpectedly");
  const visible = await new AdminApi(config).publicJson("/api/church/visualizer-events");
  if (visible.some((e) => e.slug === slug)) throw new Error("Draft unexpectedly visible publicly");
  const summary = {
    tools: tools.length,
    origin: config.origin,
    slug,
    eventIds: created.map((r) => r.id),
    translationGroupId: created[0].translationGroupId,
    status: "draft",
    model: uploaded.result,
    baseEarthUnchanged: after.model.id,
    baseProposalNotApplied: proposal.proposalId,
    publicDraftAbsent: true,
    fixtureDirectory: directory,
  };
  writeFileSync(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await client.close();
}
