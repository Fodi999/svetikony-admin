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
    assert.equal(tools.length, 18);
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
