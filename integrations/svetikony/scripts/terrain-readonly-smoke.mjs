import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const client = new Client({ name: 'terrain-readonly-smoke', version: '1' });
const transport = new StdioClientTransport({ command: process.execPath, args: [process.env.SVETIKONY_TEST_SERVER ?? resolve('dist/server.mjs')], env: { ...process.env }, stderr: 'pipe' });
transport.stderr?.on('data', () => {});
try {
  await client.connect(transport);
  const tools = await client.listTools();
  const call = async (name, args = {}) => {
    const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
    if (r.isError) throw new Error(JSON.parse(r.content[0].text).error ?? name);
    return JSON.parse(r.content[0].text);
  };
  const connection = await call('connection_status');
  if (!connection.result.connected || connection.environment !== 'local') throw new Error('LOCAL connection required');
  const before = await call('get_base_earth');
  const plan = await call('validate_terrain_bundle', { manifestPath: process.argv[2] });
  if (!plan.result.valid) throw new Error(JSON.stringify(plan.result.errors));
  const remote = await call('reconcile_terrain_bundle', { validationId: plan.result.validationId });
  const result = { tools: tools.tools.length, plan: plan.result, remote: remote.result, baseId: before.result.model?.id, remoteWrites: 0 };
  if (process.env.SVETIKONY_PLAN_OUTPUT) writeFileSync(process.env.SVETIKONY_PLAN_OUTPUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await client.close(); }
