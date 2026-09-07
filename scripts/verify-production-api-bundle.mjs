#!/usr/bin/env node
/**
 * Phase 2C regression check: fails the build (exit 1) if any known
 * business-mock seed marker from lib/mock-data/* or lib/api/mock/* is found
 * anywhere in a production build's output.
 *
 * Why this exists: getApiClient() (lib/api/index.ts) never selects
 * mockApiAdapter in a production build -- canUseMock is a compile-time-false
 * expression there -- but that dead JS-level reference alone does not stop
 * webpack from bundling the module subtree it points at. Confirmed
 * empirically (same technique as verify-production-auth-bundle.mjs's own
 * history): before next.config.ts's productionMockBundleWebpackConfig
 * existed, real production builds of this app had mock order/article/etc.
 * seed data sitting in both .next/static/ and .next/server/ chunk files,
 * reachable by anyone who opened devtools or downloaded the bundle, even
 * though no runtime code path ever served it. The fix is the same
 * NormalModuleReplacementPlugin mechanism verify-production-auth-bundle.mjs
 * already relies on for lib/mock-data/users.ts, extended to
 * lib/api/mock-adapter.ts (the single choke point all 15 lib/api/mock/**
 * resources are reached through). This script is the regression guard so a
 * future refactor (e.g. someone adding a direct top-level import from
 * lib/api/mock/** or lib/mock-data/** into a production-reachable file)
 * gets caught by a build check rather than silently shipping mock business
 * data again.
 *
 * Marker choice: every literal below is a multi-segment, hyphenated seed ID
 * or slug that exists ONLY inside lib/mock-data/**'s hand-written fixtures
 * (one per resource family) -- e.g. "order-1042" (a specific mock order's
 * id), "article-icon-history" (a specific mock article's groupId),
 * "prayer-otche-nash-uk" (a specific mock prayer's id). These are not
 * generic words like "mock" (which would false-positive on this file's own
 * doc comments, variable names, or unrelated code) and not something a
 * developer would plausibly type by coincidence elsewhere -- each is a
 * specific, arbitrary compound identifier invented for exactly one seed
 * record. Real D1 content is never embedded into the JS bundle at build
 * time (it's fetched at request time via the BFF), so there is no
 * legitimate way any of these strings could appear in build output except
 * through the excluded mock module graph.
 *
 * Usage: npm run verify:production-api-bundle
 * (run after `npm run build`. A build with NEXT_PUBLIC_FORCE_MOCK_API=true
 * still excludes these markers -- see next.config.webpack.test.ts and the
 * Phase 2C report -- so this check is expected to PASS for every real
 * production build, regardless of that flag.)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const FORBIDDEN_LITERALS = [
  "order-1042", // lib/mock-data/orders.ts
  "article-icon-history", // lib/mock-data/articles.ts
  "church-info-singleton", // lib/mock-data/church-info.ts
  "gospel-john-1", // lib/mock-data/gospel.ts
  "cal-nativity", // lib/mock-data/calendar.ts
  "icon-spasitel", // lib/mock-data/icons.ts
  "saint-mykolai", // lib/mock-data/saints.ts
  "prayer-otche-nash-uk", // lib/mock-data/prayers.ts
  "product-icon-spas-small", // lib/mock-data/products.ts
  "cat-icons", // lib/mock-data/categories.ts
  "media-icon-spasitel", // lib/mock-data/media.ts
];

const ROOT = process.cwd();
const TARGETS = [
  { label: "BROWSER STATIC CHUNKS", dir: path.join(ROOT, ".next/static") },
  { label: "SERVER BUILD", dir: path.join(ROOT, ".next/server") },
];

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) results.push(...walk(full));
    else if (entry.endsWith(".js") || entry.endsWith(".mjs")) results.push(full);
  }
  return results;
}

function scan(dir) {
  const hits = [];
  for (const file of walk(dir)) {
    const content = readFileSync(file, "utf8");
    for (const literal of FORBIDDEN_LITERALS) {
      if (content.includes(literal)) {
        hits.push({ file: path.relative(ROOT, file), literal });
      }
    }
  }
  return hits;
}

let anyFailed = false;

for (const target of TARGETS) {
  console.log(`\n=== ${target.label} (${path.relative(ROOT, target.dir)}) ===`);
  if (!existsSync(target.dir)) {
    console.log(`SKIPPED -- directory does not exist. Run \`npm run build\` first.`);
    anyFailed = true;
    continue;
  }
  const hits = scan(target.dir);
  if (hits.length === 0) {
    console.log("OK -- zero occurrences of any known business-mock seed marker.");
    continue;
  }
  anyFailed = true;
  console.log(`FAIL -- ${hits.length} occurrence(s) found:`);
  for (const hit of hits) {
    console.log(`  - "${hit.literal}" in ${hit.file}`);
  }
}

console.log("");
if (anyFailed) {
  console.error("verify:production-api-bundle FAILED -- see above.");
  process.exit(1);
} else {
  console.log("verify:production-api-bundle PASSED -- no business-mock seed data found in the build output.");
}
