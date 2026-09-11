import { test } from "node:test";
import assert from "node:assert/strict";
import { Operator } from "../src/operator.mjs";
import { AdminApi } from "../src/transport.mjs";
test("production prepares on server without local persistence and human-only apply", async () => {
  const calls = [];
  const api = {
    config: { environment: "production" },
    request: async (path) =>
      path.endsWith("/day")
        ? {
            id: "day",
            title: "Day",
            slug: "day",
            status: "published",
            language: "uk",
            dateNewStyle: "2026-09-06",
          }
        : [],
    proposalRequest: async (...args) => {
      calls.push(args);
      return { id: "server-id", status: "pending" };
    },
  };
  const op = new Operator(api, {
    add() {
      throw new Error("Must not persist local proposal");
    },
  });
  const p = await op.prepare("calendar", "day", { history: "Reviewed" }, "Reason", []);
  assert.equal(p.status, "pending");
  assert.equal(calls[0][1].body.targetId, "day");
  await op.getChange(p.id);
  await op.listChanges();
  await assert.rejects(op.apply(p.id, { publish: true }), /human review/);
});
test("proposal transport prohibits apply/reject paths and READ_ONLY create", async () => {
  const api = new AdminApi(
    { origin: "https://example.invalid", environment: "production" },
    async () =>
      Response.json({
        accessToken: "ai_" + "a".repeat(64),
        mode: "READ_ONLY",
        scopes: ["calendar.read"],
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      }),
  );
  await api.connectAiAccess("ABCD-EFGH-JKLM");
  await assert.rejects(api.proposalRequest("id/apply", { method: "POST" }));
  await assert.rejects(
    api.proposalRequest("", { method: "POST", body: { targetType: "calendar" } }),
  );
});
test('production retains local Visualizer recovery receipts',async()=>{
 const receipt={id:'operation',scope:'visualizer',status:'uncertain'};
 const op=new Operator({config:{environment:'production'},proposalRequest(){throw new Error('Not an editorial proposal');}},{get:()=>receipt});
 assert.deepEqual(await op.getChange('operation'),receipt);
});
