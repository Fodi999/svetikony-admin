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
 * EXPLICIT AUTH EXCEPTION — one of exactly the closed AUTH_EXCEPTION_FILES
 * set below, which have their own special semantics (see
 * app/api/bff/auth/{login,session,logout}/route.ts). Anything else is (C)
 * UNPROTECTED (a real gap) or (D) UNCLASSIFIED (a shape this scanner
 * cannot verify at all, e.g. an `export { GET }` re-export — see Pattern C
 * in scanRouteFile) — both fail the tests below. If a future route.ts
 * exports `POST` some other way — a bare `export async function POST`, an
 * inline `withAuth({area:"...", level:"..."}, ...)` literal instead of a
 * POLICY reference, a typo'd import, anything — this test fails, by
 * construction, not by convention. Phase 2B-3 removed this file's earlier
 * hardcoded total-handler-count and per-policy-area-count assertions:
 * they required a manual edit on every ordinary new route without proving
 * any security property the checks below don't already prove from the
 * AST directly — see the comment above the orders/settings check for the
 * reasoning.
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
  // Phase 3: same pre-auth exception as auth/login/route.ts -- the browser
  // has no session cookie yet when this route is called (it's what creates
  // one), so it can't be gated by withAuth() either. Has its own CSRF check
  // (isCrossSiteMutation) and its own dedicated route test.
  path.join(BFF_ROOT, "auth/telegram/exchange/route.ts"),
]);

type ManifestEntry =
  | { file: string; method: string; status: "protected"; policyKey: string }
  | { file: string; method: string; status: "auth_exception" }
  | { file: string; method: string; status: "unprotected"; reason: string }
  | { file: string; method: string; status: "unclassified"; reason: string };

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

    // Pattern C: `export { GET }` / `export { GET } from "./elsewhere"` —
    // neither Pattern A nor B's AST shape recognizes this, so a handler
    // exported this way would otherwise be silently invisible to this
    // scanner (never counted as protected, unprotected, or anything) —
    // the actual gap this test's own doc comment used to only claim was
    // closed by construction. Flagged as its own status so it fails loudly
    // instead of disappearing; fix by rewriting as a direct
    // `export const METHOD = withAuth(...)`.
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const specifier of statement.exportClause.elements) {
        const method = specifier.name.text;
        if (!HTTP_METHODS.has(method)) continue;
        entries.push({
          file: filePath,
          method,
          status: "unclassified",
          reason: "exported via `export { ... }` re-export syntax, which this scanner cannot verify is wrapped in withAuth()",
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

  it("therefore: since app/api/bff/_lib/auth.ts's own withAuth() calls recordMutationAudit() for every mutating method (proven directly in app/api/bff/_lib/auth.test.ts's Phase 1D.1 describe block), every protected handler is audit-capable by construction, not by having remembered to add a call in each resource route file", () => {
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

  it("every auth-exception handler found is exactly one of the closed AUTH_EXCEPTION_FILES allowlist — no more, no fewer", () => {
    // The allowlist itself (not a separately-maintained number) is the
    // source of truth: adding a new "exception" route requires a
    // deliberate edit to AUTH_EXCEPTION_FILES above, and this only checks
    // that the scanner's own findings agree with whatever that list
    // currently says — it never needs updating just because an ordinary
    // resource route was added elsewhere.
    const exceptions = manifest.filter((e) => e.status === "auth_exception");
    const files = new Set(exceptions.map((e) => e.file));
    expect(files).toEqual(AUTH_EXCEPTION_FILES);
  });

  it("has ZERO unclassified handlers — every exported HTTP-method-named binding in every route.ts is recognized as either protected, unprotected, or an auth exception (see Pattern C above for what this catches: `export { GET }` re-export syntax)", () => {
    const unclassified = manifest.filter((e) => e.status === "unclassified");
    if (unclassified.length > 0) {
      const details = unclassified.map((e) => `  - ${e.method} ${relativeFile(e)}: ${(e as { reason: string }).reason}`).join("\n");
      throw new Error(`${unclassified.length} unclassified BFF handler(s) found:\n${details}`);
    }
    expect(unclassified).toHaveLength(0);
  });

  // Deliberately no hardcoded total/per-policy-area handler counts here:
  // the properties that actually matter (every handler classified, every
  // resource handler protected, every policy key real, the auth-exception
  // set closed) are all asserted directly above/below from the AST itself.
  // A raw total would only add friction — requiring a manual edit here on
  // every ordinary new route — without proving anything these other
  // checks don't already prove. See PHASE 2B-3's report for the actual
  // current counts, computed from this same manifest, not maintained by
  // hand in this file.

  it("no resource route uses the settings area — confirmed no BFF route exists for it yet; orders DOES now (Phase 2B-5B), the opposite of the Phase 1C baseline this test used to assert for both", () => {
    const areas: Set<string> = new Set(
      manifest.filter((e) => e.status === "protected").map((e) => POLICY[e.policyKey as keyof typeof POLICY].area),
    );
    expect(areas.has("orders")).toBe(true);
    expect(areas.has("settings")).toBe(false);
  });
});
