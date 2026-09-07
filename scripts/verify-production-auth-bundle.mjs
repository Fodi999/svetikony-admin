#!/usr/bin/env node
/**
 * Phase 1B.1 regression check: fails the build (exit 1) if any known
 * dev/demo credential literal from lib/mock-data/users.ts is found
 * anywhere in a production build's output.
 *
 * Why this exists: a static top-level `import`, then a conditional
 * `require()`, then a NODE_ENV-gated next/dynamic import, and even a plain
 * webpack `resolve.alias` were all tried and each still left these strings
 * in .next/static/ and/or .next/server/ chunk files -- confirmed
 * empirically, not assumed. The fix that actually worked is
 * next.config.ts's `NormalModuleReplacementPlugin`, swapping
 * lib/mock-data/users.ts for lib/mock-data/users.production-stub.ts at the
 * webpack module-resolution level whenever NEXT_PUBLIC_FORCE_MOCK_API
 * isn't "true" at build time. This script is the regression guard so a
 * future refactor (e.g. someone reverting to a plain import for
 * convenience) gets caught by CI/a pre-deploy check rather than silently
 * shipping plaintext demo passwords again.
 *
 * Does NOT store or check any real production secret -- only the known,
 * already-public dev/demo passwords from lib/mock-data/users.ts
 * (admin123/editor123/orders123/viewer123). Passwords, not the demo
 * emails: an email like admin@svetikony.com can legitimately appear as a
 * harmless UI placeholder (the login form's own `placeholder="admin@svet
 * ikony.com"` hint, with no password attached) without being a real
 * credential leak, so checking for it produces false positives; a bare
 * password string has no legitimate reason to ever appear in a real
 * production build's output at all.
 *
 * Usage: npm run verify:production-auth-bundle
 * (run after `npm run build` -- a build with NEXT_PUBLIC_FORCE_MOCK_API=true,
 * such as Playwright's own e2e build, is EXPECTED to fail this check --
 * that build deliberately includes the mock adapter. Run this only against
 * a real/default production build.)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const FORBIDDEN_LITERALS = ["admin123", "editor123", "orders123", "viewer123"];

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
    console.log("OK -- zero occurrences of any known dev/demo credential literal.");
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
  console.error("verify:production-auth-bundle FAILED -- see above.");
  process.exit(1);
} else {
  console.log("verify:production-auth-bundle PASSED -- no dev/demo credentials found in the build output.");
}
