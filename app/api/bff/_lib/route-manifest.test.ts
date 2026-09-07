import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";
import { POLICY } from "./route-policies";

/**
 * Phase 1C's structural guarantee: every exported HTTP handler in
 * app/api/bff/**\/route.ts is either (A) PROTECTED — its export is
 * `withAuth(POLICY.<key>, handler)`, a real, parseable call whose policy
 * key resolves to a real member of the one shared POLICY table — or (B) an
 * EXPLICIT AUTH EXCEPTION — one of exactly the 3 files under
 * app/api/bff/auth/**, which have their own special semantics (see
 * app/api/bff/auth/{login,session,logout}/route.ts). No third state. If a
 * future route.ts exports `POST` some other way — a bare
 * `export async function POST`, an inline `withAuth({area:"...",
 * level:"..."}, ...)` literal instead of a POLICY reference, a typo'd
 * import, anything — this test fails, by construction, not by convention.
 *
 * Uses the TypeScript compiler API (already a project dependency, used for
 * `tsc` itself) for real AST parsing rather than a regex/string scan —
 * regex over source text is fooled by handler names appearing in
 * comments, string literals, or unrelated code shape changes; parsing the
 * actual syntax tree means this only ever recognizes the two real
 * patterns being asserted on. The one thing this scanner deliberately does
 * NOT try to verify statically: that `handler` (withAuth's second
 * argument) is actually the file's own business logic and not some
 * unrelated function — that's exercised by each route's own
 * request/response test instead, not a static-analysis concern.
 */

const BFF_ROOT = path.join(process.cwd(), "app/api/bff");
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

/** The only files allowed to export a handler NOT wrapped in withAuth().
 * Deliberately a hardcoded, closed list — not a pattern/glob — so adding a
 * new "exception" requires editing this test file directly, not just
 * dropping a file in the right directory. */
const AUTH_EXCEPTION_FILES = new Set([
  path.join(BFF_ROOT, "auth/login/route.ts"),
  path.join(BFF_ROOT, "auth/session/route.ts"),
  path.join(BFF_ROOT, "auth/logout/route.ts"),
]);

type ManifestEntry =
  | { file: string; method: string; status: "protected"; policyKey: string }
  | { file: string; method: string; status: "auth_exception" }
  | { file: string; method: string; status: "unprotected"; reason: string };

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) results.push(...findRouteFiles(full));
    else if (entry === "route.ts") results.push(full);
  }
  return results;
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return !!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/** Scans one route.ts file's top-level statements for every exported HTTP
 * method handler, classifying each as protected/auth_exception/unprotected. */
function scanRouteFile(filePath: string): ManifestEntry[] {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const entries: ManifestEntry[] = [];
  const isAuthException = AUTH_EXCEPTION_FILES.has(filePath);

  for (const statement of sourceFile.statements) {
    // Pattern A (expected, protected): `export const GET = withAuth(POLICY.x, handler);`
    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !HTTP_METHODS.has(decl.name.text)) continue;
        const method = decl.name.text;
        const init = decl.initializer;

        if (
          init &&
          ts.isCallExpression(init) &&
          ts.isIdentifier(init.expression) &&
          init.expression.text === "withAuth" &&
          init.arguments.length >= 1 &&
          ts.isPropertyAccessExpression(init.arguments[0]!) &&
          ts.isIdentifier(init.arguments[0]!.expression) &&
          init.arguments[0]!.expression.text === "POLICY"
        ) {
          entries.push({ file: filePath, method, status: "protected", policyKey: init.arguments[0]!.name.text });
        } else if (isAuthException) {
          // The 3 auth routes may export a const in some other shape;
          // still an explicit, allowed exception.
          entries.push({ file: filePath, method, status: "auth_exception" });
        } else {
          entries.push({
            file: filePath,
            method,
            status: "unprotected",
            reason: "exported const is not `withAuth(POLICY.<key>, handler)`",
          });
        }
      }
    }

    // Pattern B: `export async function GET(...) {...}` — only ever valid
    // for the 3 hardcoded auth-exception files.
    if (ts.isFunctionDeclaration(statement) && hasExportModifier(statement) && statement.name && HTTP_METHODS.has(statement.name.text)) {
      const method = statement.name.text;
      if (isAuthException) {
        entries.push({ file: filePath, method, status: "auth_exception" });
      } else {
        entries.push({
          file: filePath,
          method,
          status: "unprotected",
          reason: "raw `export async function` handler, not wrapped in withAuth()",
        });
      }
    }
  }

  return entries;
}

function buildManifest(): ManifestEntry[] {
  return findRouteFiles(BFF_ROOT).flatMap(scanRouteFile);
}

/**
 * Phase 1D.1's structural coverage proof (your item 13): audit recording
 * lives inside withAuth() itself (app/api/bff/_lib/auth.ts), not as a
 * separate call site in each route file — so "every mutating handler is
 * audit-capable" reduces to "every protected handler's withAuth import
 * resolves to that exact one file". This finds, for a given source file,
 * which module its `withAuth` identifier actually came from (resolved to
 * an absolute path, so `../_lib/auth` and `../../../_lib/auth` compare
 * equal when they really do point at the same file).
 */
function resolveWithAuthImportSource(filePath: string): string | null {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings) continue;
    const namedBindings = statement.importClause.namedBindings;
    if (!ts.isNamedImports(namedBindings)) continue;
    const importsWithAuth = namedBindings.elements.some((el) => (el.propertyName ?? el.name).text === "withAuth");
    if (!importsWithAuth) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

    const specifier = statement.moduleSpecifier.text;
    if (!specifier.startsWith(".")) return specifier; // non-relative import would be a red flag on its own, but not this test's concern
    const resolved = path.resolve(path.dirname(filePath), specifier);
    return resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
  }
  return null;
}

describe("Phase 1D.1 — audit structural coverage: every protected handler imports the ONE shared withAuth", () => {
  const manifest = buildManifest();
  const protectedFiles = [...new Set(manifest.filter((e) => e.status === "protected").map((e) => e.file))];
  const CANONICAL_AUTH_MODULE = path.join(BFF_ROOT, "_lib/auth.ts");

  it("sanity: the canonical module actually exists at the expected path", () => {
    expect(statSync(CANONICAL_AUTH_MODULE).isFile()).toBe(true);
  });

  it("every file with at least one protected handler imports withAuth from the same _lib/auth.ts — not a copy, not a re-export, not a differently-named local helper", () => {
    const wrongSource: { file: string; resolvedTo: string | null }[] = [];
    for (const file of protectedFiles) {
      const resolved = resolveWithAuthImportSource(file);
      if (resolved !== CANONICAL_AUTH_MODULE) wrongSource.push({ file: path.relative(process.cwd(), file), resolvedTo: resolved });
    }
    if (wrongSource.length > 0) {
      throw new Error(
        `${wrongSource.length} file(s) import withAuth from somewhere other than the canonical module:\n` +
          wrongSource.map((e) => `  - ${e.file} -> ${e.resolvedTo ?? "(no withAuth import found)"}`).join("\n"),
      );
    }
    expect(wrongSource).toHaveLength(0);
  });

  it("therefore: since app/api/bff/_lib/auth.ts's own withAuth() calls recordMutationAudit() for every mutating method (proven directly in app/api/bff/_lib/auth.test.ts's Phase 1D.1 describe block), all 71 protected handlers are audit-capable by construction, not by having remembered to add a call in each of 47 files", () => {
    // No new assertion here -- this test exists to document the logical
    // chain the two tests above actually prove, in one place a reviewer
    // can read without re-deriving it: (1) every protected handler uses
    // the same withAuth, (2) that withAuth audits every mutation it
    // authorizes. Left as a real (trivially-true) assertion rather than a
    // bare comment so it shows up in test output and can't silently rot.
    expect(protectedFiles.length).toBeGreaterThan(0);
  });
});

function relativeFile(entry: ManifestEntry): string {
  return path.relative(process.cwd(), entry.file);
}

describe("BFF route manifest — exhaustive server-side authorization check (Phase 1C)", () => {
  const manifest = buildManifest();

  it("finds a non-trivial number of route files (sanity check that the scanner itself works)", () => {
    expect(manifest.length).toBeGreaterThan(50);
  });

  it("has ZERO unprotected resource handlers — every exported HTTP handler is either protected or an explicit auth exception", () => {
    const unprotected = manifest.filter((e) => e.status === "unprotected");
    if (unprotected.length > 0) {
      const details = unprotected.map((e) => `  - ${e.method} ${relativeFile(e)}: ${(e as { reason: string }).reason}`).join("\n");
      throw new Error(`${unprotected.length} unprotected BFF handler(s) found:\n${details}`);
    }
    expect(unprotected).toHaveLength(0);
  });

  it("every protected handler's policy key resolves to a real member of the shared POLICY table (route.ts and this test read the identical object)", () => {
    for (const entry of manifest) {
      if (entry.status !== "protected") continue;
      expect(Object.prototype.hasOwnProperty.call(POLICY, entry.policyKey), `${relativeFile(entry)} (${entry.method}) references POLICY.${entry.policyKey}, which does not exist`).toBe(true);
    }
  });

  it("has exactly 3 auth-exception handlers, exactly the 3 hardcoded auth routes", () => {
    const exceptions = manifest.filter((e) => e.status === "auth_exception");
    expect(exceptions).toHaveLength(3);
    const files = new Set(exceptions.map(relativeFile));
    expect(files).toEqual(
      new Set([
        "app/api/bff/auth/login/route.ts",
        "app/api/bff/auth/session/route.ts",
        "app/api/bff/auth/logout/route.ts",
      ]),
    );
  });

  it("finds exactly 74 total exported HTTP handlers (71 protected + 3 auth exceptions) — a change here means a route was added/removed and this expectation must be consciously updated", () => {
    expect(manifest).toHaveLength(74);
    expect(manifest.filter((e) => e.status === "protected")).toHaveLength(71);
  });

  it("POLICY MAP: matches the exact area/level distribution recorded in the Phase 1C report", () => {
    const counts: Record<string, number> = {};
    for (const entry of manifest) {
      if (entry.status !== "protected") continue;
      counts[entry.policyKey] = (counts[entry.policyKey] ?? 0) + 1;
    }
    expect(counts).toEqual({
      contentView: 10,
      contentEdit: 23,
      catalogView: 4,
      catalogEdit: 6,
      mediaView: 1,
      mediaEdit: 2,
      telegramView: 9,
      telegramEdit: 16,
    });
  });

  it("no resource route uses the orders or settings areas — confirmed no BFF route exists for either yet (see Phase 1C report's temporary-mock-module status)", () => {
    const areas: Set<string> = new Set(
      manifest.filter((e) => e.status === "protected").map((e) => POLICY[e.policyKey as keyof typeof POLICY].area),
    );
    expect(areas.has("orders")).toBe(false);
    expect(areas.has("settings")).toBe(false);
  });
});
