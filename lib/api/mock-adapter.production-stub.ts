import type { ApiClient } from "@/lib/api/client";

/**
 * Build-time stand-in for lib/api/mock-adapter.ts, swapped in by
 * next.config.ts's webpack NormalModuleReplacementPlugin for any production
 * build (Phase 2C) — the exact same mechanism already proven for
 * lib/mock-data/users.ts (see lib/mock-data/users.production-stub.ts's own
 * doc comment for why a JS-level dead branch alone does not reliably keep a
 * module's whole import subtree out of a production chunk: webpack's
 * module-graph/chunk-splitting phase adds an edge for every static
 * `import` it finds syntactically, before Terser's later dead-branch
 * elimination runs).
 *
 * The real mock-adapter.ts statically imports all 15 lib/api/mock/**
 * resources, most of which in turn import lib/mock-data/** business seed
 * data (mock orders with real-looking customer names/phone numbers, mock
 * articles, mock church info, etc.). Confirmed empirically (Phase 2C):
 * before this replacement existed, that seed data was present in both
 * .next/static and .next/server chunks of a real production build, even
 * though getApiClient() (lib/api/index.ts) never actually selects
 * mockApiAdapter there — canUseMock is a compile-time-false expression in
 * production, so the reference was dead code, but dead code alone doesn't
 * stop webpack from bundling it. With this replacement, the real
 * mock-adapter.ts (and therefore all of lib/api/mock/** and the business
 * portion of lib/mock-data/**) is never even read by the compiler for a
 * production build — verified by rebuilding and grepping .next/static/ +
 * .next/server/ for known mock-data markers, same technique the original
 * users.ts fix used.
 *
 * Every property access throws rather than silently returning fake data:
 * getApiClient() never evaluates this value at all in production (proven
 * by lib/api/index.test.ts's adapter-selection matrix), so if that
 * invariant were ever broken by a future bug, the failure here is loud and
 * immediate — never a mystery mock response served to a real user.
 */
export const mockApiAdapter: ApiClient = new Proxy(
  {},
  {
    get(): never {
      throw new Error("mockApiAdapter is unreachable in production builds — see lib/api/index.ts's canUseMock invariant");
    },
  },
) as ApiClient;
