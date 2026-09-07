import type { MockAccount } from "./users";

/**
 * Build-time stand-in for lib/mock-data/users.ts, swapped in by
 * next.config.ts's webpack alias whenever NEXT_PUBLIC_FORCE_MOCK_API isn't
 * "true" at build time (Phase 1B.1).
 *
 * Why a whole separate file instead of trusting dead-code elimination:
 * confirmed empirically that neither a static top-level `import` nor a
 * conditional `require()` reliably keeps this project's webpack production
 * build from still emitting lib/mock-data/users.ts's plaintext demo
 * passwords into a chunk file, even when the only call site referencing it
 * is behind a compile-time-false condition — webpack's module-graph/
 * chunk-splitting phase adds an edge for every `require`/`import` it finds
 * syntactically, before Terser's later dead-branch elimination runs, and a
 * module that ends up shared across many pages can get extracted into a
 * common chunk regardless of whether any surviving code path still calls
 * it. A build-time module *replacement* (this alias), by contrast, means
 * the real file — and its plaintext data — is never even read by the
 * compiler for a production build, so there is nothing for any later
 * optimization pass to get wrong.
 *
 * Real shape preserved (an empty array, not a different type) so
 * lib/api/mock/auth.ts still type-checks and behaves correctly: with zero
 * accounts, every login attempt fails, which is irrelevant in a real
 * production build anyway since this whole mock path is unreachable
 * there — see lib/api/index.ts.
 */
export const mockAccounts: MockAccount[] = [];
