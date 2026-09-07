import { describe, expect, it } from "vitest";
import { mockApiAdapter } from "@/lib/api/mock-adapter";
import { createHttpApiAdapter } from "@/lib/api/http-adapter";

/**
 * Phase 2C, item 10: a new ApiClient resource must never be silently left
 * unimplemented by the production adapter.
 *
 * The primary guarantee is already a compile-time one: both
 * `createHttpApiAdapter(): ApiClient` (lib/api/http-adapter.ts) and
 * `mockApiAdapter: ApiClient` (lib/api/mock-adapter.ts) are plain object
 * literals with an explicit `ApiClient` return/variable type annotation, no
 * `as ApiClient` cast anywhere in either file -- TypeScript's structural
 * check on an object literal against a required-properties interface fails
 * the moment a property in ApiClient goes unimplemented (confirmed
 * empirically for this exact phase: temporarily adding a new required
 * ApiClient property and re-running `tsc --noEmit` produced
 * "error TS2741: Property '...' is missing" against BOTH files, then
 * reverted -- see the Phase 2C report).
 *
 * This test is the independent runtime half of that guarantee: it doesn't
 * re-derive `keyof ApiClient` (not available at runtime, types are erased),
 * but cross-checks that the two real ApiClient implementations -- which by
 * construction must each cover 100% of ApiClient's keys, or neither would
 * compile -- agree on exactly the same key set. If they ever diverge (e.g.
 * a future refactor swaps one file's type annotation for a looser `as`
 * cast, silently reopening the gap the compile-time check closes), this
 * fails independently of tsc.
 */
describe("ApiClient completeness — production adapter vs. mock adapter (Phase 2C)", () => {
  it("createHttpApiAdapter() and mockApiAdapter expose the exact same top-level resource keys", () => {
    const productionKeys = Object.keys(createHttpApiAdapter()).sort();
    const mockKeys = Object.keys(mockApiAdapter).sort();
    expect(productionKeys).toEqual(mockKeys);
  });

  it("sanity: covers a non-trivial number of resources (not an accidentally-empty comparison)", () => {
    expect(Object.keys(createHttpApiAdapter()).length).toBeGreaterThanOrEqual(15);
  });
});
