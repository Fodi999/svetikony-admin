import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Phase 2C: exercises the actual `webpack()` function Next.js's build
 * process reads from next.config.ts -- not a re-implementation of it -- so
 * a future edit that silently drops the production-only mock-bundle
 * exclusion (or reintroduces a self-referential replacement loop) fails
 * this test rather than only being caught by rebuilding and grepping
 * .next/ by hand. Same pattern as next.config.headers.test.ts.
 */

interface FakeResource {
  request: string;
}

class FakeNormalModuleReplacementPlugin {
  constructor(
    public pattern: RegExp,
    public callback: (resource: FakeResource) => void,
  ) {}
}

interface FakeWebpackConfig {
  plugins: FakeNormalModuleReplacementPlugin[];
}

type WebpackFn = (config: FakeWebpackConfig, ctx: { webpack: { NormalModuleReplacementPlugin: typeof FakeNormalModuleReplacementPlugin } }) => FakeWebpackConfig;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/**
 * Imports the named `productionMockBundleWebpackConfig` export directly,
 * not `next.config`'s default export -- the default is `withSerwist(nextConfig)`,
 * whose wrapped `.webpack()` reads several other Next-supplied build-context
 * fields (e.g. `options.basePath`) that a minimal fake context here can't
 * satisfy. This is the exact function nextConfig.webpack delegates to, so
 * behavior under test is identical either way.
 */
async function loadWebpackFn(): Promise<WebpackFn> {
  const mod = (await import("./next.config")) as { productionMockBundleWebpackConfig?: WebpackFn };
  if (!mod.productionMockBundleWebpackConfig) throw new Error("next.config has no productionMockBundleWebpackConfig export");
  return mod.productionMockBundleWebpackConfig;
}

function runWebpackFn(webpackFn: WebpackFn): FakeWebpackConfig {
  const config: FakeWebpackConfig = { plugins: [] };
  webpackFn(config, { webpack: { NormalModuleReplacementPlugin: FakeNormalModuleReplacementPlugin } });
  return config;
}

describe("next.config.ts webpack() — production mock-bundle exclusion (Phase 2C)", () => {
  it("adds zero module-replacement plugins outside production -- dev must resolve the real lib/mock-data/users.ts and lib/api/mock-adapter.ts unchanged", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const webpackFn = await loadWebpackFn();
    const config = runWebpackFn(webpackFn);
    expect(config.plugins).toHaveLength(0);
  });

  it("in production, registers exactly 2 replacement plugins: lib/mock-data/users -> its production stub, and lib/api/mock-adapter -> its production stub", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const webpackFn = await loadWebpackFn();
    const config = runWebpackFn(webpackFn);
    expect(config.plugins).toHaveLength(2);

    const usersResource: FakeResource = { request: "/app/lib/mock-data/users.ts" };
    const usersPlugin = config.plugins.find((p) => p.pattern.test(usersResource.request));
    expect(usersPlugin, "no plugin pattern matched lib/mock-data/users.ts").toBeDefined();
    usersPlugin!.callback(usersResource);
    expect(usersResource.request).toBe(path.join(process.cwd(), "lib/mock-data/users.production-stub.ts"));

    const adapterResource: FakeResource = { request: "/app/lib/api/mock-adapter.ts" };
    const adapterPlugin = config.plugins.find((p) => p.pattern.test(adapterResource.request));
    expect(adapterPlugin, "no plugin pattern matched lib/api/mock-adapter.ts").toBeDefined();
    adapterPlugin!.callback(adapterResource);
    expect(adapterResource.request).toBe(path.join(process.cwd(), "lib/api/mock-adapter.production-stub.ts"));
  });

  it("neither production-stub filename matches its own replacement pattern -- no self-referential replacement loop", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const webpackFn = await loadWebpackFn();
    const config = runWebpackFn(webpackFn);
    expect(config.plugins.some((p) => p.pattern.test("/app/lib/mock-data/users.production-stub.ts"))).toBe(false);
    expect(config.plugins.some((p) => p.pattern.test("/app/lib/api/mock-adapter.production-stub.ts"))).toBe(false);
  });
});
