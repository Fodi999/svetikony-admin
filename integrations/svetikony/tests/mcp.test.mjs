import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.mjs";
test("MCP handshake exposes scoped tools with publication annotations and validated arguments", async () => {
  let wrote = false;
  const op = {
    async list() {
      return [];
    },
    store: {
      events() {
        return [];
      },
    },
    async apply() {
      wrote = true;
      return {};
    },
  };
  const server = createServer(op, { environment: "local", origin: "http://localhost:3000" });
  const client = new Client({ name: "integration-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  await client.connect(b);
  try {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 36);
    assert.equal(tools.find((t) => t.name === "publish_change").annotations.destructiveHint, true);
    assert.equal(tools.find((t) => t.name === "connection_status").annotations.readOnlyHint, true);
    assert.equal(tools.find((t) => t.name === "apply_draft").annotations.readOnlyHint, false);
    assert.ok(!tools.some((t) => /deploy|delete|sql|shell|send_telegram/.test(t.name)));
    const status = await client.callTool({ name: "connection_status", arguments: {} });
    assert.equal(JSON.parse(status.content[0].text).result.connected, true);
    const result = await client.callTool({
      name: "apply_draft",
      arguments: { changeId: "not-an-id" },
    });
    assert.equal(result.isError, true);
    assert.equal(wrote, false);
    assert.match(client.getInstructions(), /publication request/);
  } finally {
    await client.close();
    await server.close();
  }
});

test("Visualizer MCP tools validate fields, preserve draft/group and require Base Earth approval", async () => {
  const { setup, event } = await import("./helpers/visualizer.mjs");
  const { randomUUID } = await import("node:crypto");
  const s = setup();
  const server = createServer({ api: s.api, store: s.store, uploadRoots: [s.dir] }, s.config);
  const client = new Client({ name: "visualizer-mcp-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  await client.connect(b);
  const call = (name, args) => client.callTool({ name, arguments: args });
  try {
    const names = (await client.listTools()).tools;
    for (const name of [
      "list_visualizer_events",
      "get_visualizer_event",
      "create_visualizer_event",
      "update_visualizer_event",
      "list_visualizer_models",
      "upload_visualizer_glb",
      "attach_model_to_visualizer_event",
      "get_base_earth",
      "set_base_earth",
    ])
      assert.ok(names.some((t) => t.name === name));
    assert.equal(names.find((t) => t.name === "set_base_earth").annotations.destructiveHint, true);
    const bad = await call("create_visualizer_event", {
      requestId: randomUUID(),
      event: { ...event, status: "published" },
    });
    assert.equal(bad.isError, true);
    assert.equal(s.writes.length, 0);
    const good = await call("create_visualizer_event", { requestId: randomUUID(), event });
    assert.ok(!good.isError);
    const id = JSON.parse(good.content[0].text).result.result.event.id;
    const detail = await call("get_visualizer_event", { id });
    assert.equal(JSON.parse(detail.content[0].text).result.event.status, "draft");
    const file = await call("upload_visualizer_glb", { requestId: randomUUID(), path: s.path });
    assert.ok(!file.isError);
    const modelId = JSON.parse(file.content[0].text).result.result.model.id;
    const attached = await call("attach_model_to_visualizer_event", {
      requestId: randomUUID(),
      modelId,
      eventId: id,
    });
    assert.ok(!attached.isError);
    const denied = await call("set_base_earth", { proposalId: randomUUID(), confirmation: "yes" });
    assert.equal(denied.isError, true);
    assert.ok(!s.writes.some((w) => w.path.endsWith("/set-base-earth")));
  } finally {
    await client.close();
    await server.close();
    s.close();
  }
});
