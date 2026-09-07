import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Phase 2C's structural guarantee: createHttpApiAdapter()'s (lib/api/http-adapter.ts)
 * own import graph -- transitively, not just its own direct imports -- never
 * reaches lib/api/mock/ or lib/mock-data/. This is a stronger claim than
 * "the production bundle doesn't contain mock seed strings" (that's
 * scripts/verify-production-api-bundle.mjs's job, run after a real build);
 * this one works on source alone, so it fails immediately on `npm test`
 * the moment someone adds a single new `import ... from "@/lib/api/mock/x"`
 * anywhere in the production adapter's dependency tree, transitively through
 * any number of intermediate files, without needing a full production
 * build+grep cycle to notice.
 *
 * Uses the TypeScript compiler API (already a project dependency, same tool
 * route-manifest.test.ts uses) for real AST parsing of every import/export
 * moduleSpecifier -- both `import ... from "..."` and `export ... from "..."`
 * (re-exports), and both value and type-only imports (a type-only edge is
 * erased from the compiled bundle, but this test is a stricter *source*
 * invariant: the production adapter's dependency tree should not reference
 * the mock module graph at all, not even for types).
 */

const ROOT = process.cwd();
const ENTRY = path.join(ROOT, "lib/api/http-adapter.ts");
const FORBIDDEN_DIR_SEGMENTS = [`${path.sep}lib${path.sep}api${path.sep}mock${path.sep}`, `${path.sep}lib${path.sep}mock-data${path.sep}`];

const EXTENSIONS_TO_TRY = [".ts", ".tsx", `${path.sep}index.ts`, `${path.sep}index.tsx`];

function resolveModule(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null; // bare package import (react, zod, next/server, ...) -- not this repo's source

  const base = specifier.startsWith("@/") ? path.join(ROOT, specifier.slice(2)) : path.resolve(path.dirname(fromFile), specifier);

  if (existsSync(base) && existsSync(base) && !base.endsWith(path.sep) && /\.(ts|tsx)$/.test(base)) return base;
  for (const suffix of EXTENSIONS_TO_TRY) {
    const candidate = base + suffix;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function collectModuleSpecifiers(filePath: string): string[] {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const specifiers: string[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      specifiers.push(statement.moduleSpecifier.text);
    }
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }
  return specifiers;
}

function traverse(entry: string): Set<string> {
  const visited = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const specifier of collectModuleSpecifiers(current)) {
      const resolved = resolveModule(current, specifier);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return visited;
}

describe("createHttpApiAdapter() source-graph invariant (Phase 2C)", () => {
  const visited = traverse(ENTRY);

  it("sanity: the traversal actually explores a non-trivial number of files (proves resolution isn't silently failing)", () => {
    expect(visited.size).toBeGreaterThan(15);
  });

  it("never transitively imports anything under lib/api/mock/ or lib/mock-data/", () => {
    const violations = [...visited].filter((file) => FORBIDDEN_DIR_SEGMENTS.some((segment) => file.includes(segment)));
    if (violations.length > 0) {
      throw new Error(`createHttpApiAdapter()'s import graph reaches ${violations.length} forbidden mock module(s):\n${violations.map((f) => `  - ${path.relative(ROOT, f)}`).join("\n")}`);
    }
    expect(violations).toHaveLength(0);
  });

  it("does include the real (non-mock) HTTP resource modules -- confirms this is testing the actual production graph, not an empty/broken traversal", () => {
    const relPaths = [...visited].map((f) => path.relative(ROOT, f));
    expect(relPaths).toContain(path.join("lib", "api", "http", "orders.ts"));
    expect(relPaths).toContain(path.join("lib", "api", "http", "dashboard.ts"));
    expect(relPaths).toContain(path.join("lib", "api", "http", "articles.ts"));
  });
});
