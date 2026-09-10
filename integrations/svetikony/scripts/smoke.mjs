// Real MCP stdio handshake, read-only tools only. No API writes or generation.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
const state = mkdtempSync(tmpdir() + "/svetikony-smoke-");
const client = new Client({ name: "svetikony-readonly-smoke", version: "1" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve("dist/server.mjs")],
  env: { ...process.env, SVETIKONY_STATE_DIR: state },
  stderr: "pipe",
});
transport.stderr?.on("data", () => {});
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const call = async (name, args = {}) => {
    const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 300000 });
    if (r.isError) throw new Error("Tool failed: " + name);
    return JSON.parse(r.content[0].text);
  };
  const status = await call("connection_status");
  if (!status.result.connected) throw new Error("Administrative API is not connected");
  const inventory = await call("site_inventory");
  const coverage = await call("calendar_coverage", { year: 2026, language: "uk", month: 9 });
  const audit = await call("audit_content", { limit: 1 });
  console.log(
    JSON.stringify(
      {
        tools: tools.length,
        status: status.result,
        environment: status.environment,
        origin: status.origin,
        inventory: inventory.result,
        coverage: {
          year: coverage.result.year,
          totalDays: coverage.result.totalDays,
          presentDays: coverage.result.presentDays,
          publishedDays: coverage.result.publishedDays,
          complete: coverage.result.complete,
        },
        audit: { issueCount: audit.result.issueCount, complete: audit.result.complete },
        writes: 0,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
  rmSync(state, { recursive: true, force: true });
}
