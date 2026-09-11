import { test } from "node:test";
import assert from "node:assert/strict";
import { Operator } from "../src/operator.mjs";
import { AdminApi } from "../src/transport.mjs";
test("delegated grant prepares a PUBLISHED target on the server without local persistence, and never applies it locally", async () => {
  const calls = [];
  const api = {
    config: { environment: "production" },
    delegated: true,
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
  assert.equal(p.mode, "proposal");
  assert.equal(p.status, "pending");
  assert.equal(calls[0][1].body.targetId, "day");
  await op.getChange(p.id);
  await op.listChanges();
  await assert.rejects(op.apply(p.id, { publish: true }), /human review/);
});
test("delegated grant writes a DRAFT target directly and verifies by readback, never creating a proposal", async () => {
  const calls = [];
  const rows = {
    day: {
      id: "day",
      title: "Day",
      slug: "day",
      status: "draft",
      language: "uk",
      dateNewStyle: "2026-09-06",
    },
  };
  const api = {
    config: { environment: "production" },
    delegated: true,
    request: async (path, { method, body } = {}) => {
      calls.push({ path, method, body });
      if (method === "PUT") {
        Object.assign(rows.day, body);
        return { ...rows.day };
      }
      return path.endsWith("/day") ? { ...rows.day } : [];
    },
    proposalRequest: async () => {
      throw new Error("Must not create a server proposal for a draft target");
    },
  };
  const op = new Operator(api, {
    add() {
      throw new Error("Must not persist local proposal");
    },
  });
  const r = await op.prepare("calendar", "day", { history: "Reviewed" }, "Reason", []);
  assert.equal(r.mode, "direct");
  assert.equal(r.after.history, "Reviewed");
  assert.equal(rows.day.status, "draft");
  assert.ok(calls.some((c) => c.method === "PUT"));
});
test("link_related_content direct-writes a draft child's calendarDayId under a delegated grant", async () => {
  const calendarDay = {
    id: "day",
    title: "Day",
    slug: "day",
    status: "published",
    language: "uk",
    dateNewStyle: "2026-09-06",
  };
  const saintRow = { id: "saint-1", name: "S", slug: "s", language: "uk", status: "draft", calendarDayId: null };
  const api = {
    config: { environment: "production" },
    delegated: true,
    request: async (path, { method, body } = {}) => {
      if (path.endsWith("/day")) return { ...calendarDay };
      if (path.endsWith("/saint-1") && method === "PUT") {
        Object.assign(saintRow, body);
        return { ...saintRow };
      }
      if (path.endsWith("/saint-1")) return { ...saintRow };
      return [];
    },
    proposalRequest: async () => {
      throw new Error("Must not create a proposal for a draft child");
    },
  };
  const op = new Operator(api, {});
  const r = await op.linkRelatedContent("day", "saints", "saint-1", "Link");
  assert.equal(r.mode, "direct");
  assert.equal(r.after.calendarDayId, "day");
  assert.equal(saintRow.status, "draft");
});
test("link_related_content proposes when the child is already published", async () => {
  const calendarDay = {
    id: "day",
    title: "Day",
    slug: "day",
    status: "published",
    language: "uk",
    dateNewStyle: "2026-09-06",
  };
  const saintRow = {
    id: "saint-1",
    name: "S",
    slug: "s",
    language: "uk",
    status: "published",
    calendarDayId: null,
  };
  const calls = [];
  const api = {
    config: { environment: "production" },
    delegated: true,
    request: async (path) => {
      if (path.endsWith("/day")) return { ...calendarDay };
      if (path.endsWith("/saint-1")) return { ...saintRow };
      return [];
    },
    proposalRequest: async (...args) => {
      calls.push(args);
      return { id: "proposal-1", status: "pending" };
    },
  };
  const op = new Operator(api, {});
  const r = await op.linkRelatedContent("day", "saints", "saint-1", "Link");
  assert.equal(r.mode, "proposal");
  assert.equal(calls[0][1].body.targetType, "saints");
  assert.equal(calls[0][1].body.patch.calendarDayId, "day");
});
test("delegated grant refuses to automatically edit an archived target", async () => {
  const api = {
    config: { environment: "production" },
    delegated: true,
    request: async (path) =>
      path.endsWith("/day")
        ? {
            id: "day",
            title: "Day",
            slug: "day",
            status: "archived",
            language: "uk",
            dateNewStyle: "2026-09-06",
          }
        : [],
  };
  const op = new Operator(api, {});
  await assert.rejects(
    op.prepare("calendar", "day", { history: "Reviewed" }, "Reason", []),
    /requires human review/,
  );
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
test('delegated production connection retains local Visualizer recovery receipts',async()=>{
 const receipt={id:'operation',scope:'visualizer',status:'uncertain'};
 const op=new Operator({config:{environment:'production'},delegated:true,proposalRequest(){throw new Error('Not an editorial proposal');}},{get:()=>receipt});
 assert.deepEqual(await op.getChange('operation'),receipt);
});
