import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEY = "NEXT_PUBLIC_USE_REAL_API";

describe("getApiClient adapter toggle", () => {
  const original = process.env[ENV_KEY];

  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it("defaults to the mock adapter when the flag is unset", async () => {
    delete process.env[ENV_KEY];
    const { getApiClient } = await import("./index");
    const { mockApiAdapter } = await import("./mock-adapter");
    expect(getApiClient()).toBe(mockApiAdapter);
  });

  it("defaults to the mock adapter for any value other than the literal string 'true'", async () => {
    process.env[ENV_KEY] = "1";
    const { getApiClient } = await import("./index");
    const { mockApiAdapter } = await import("./mock-adapter");
    expect(getApiClient()).toBe(mockApiAdapter);
  });

  it("switches alphabetLetters, prayers, and media to the real HTTP resource when set to 'true', leaving other resources on mock", async () => {
    process.env[ENV_KEY] = "true";
    const { getApiClient } = await import("./index");
    const { mockApiAdapter } = await import("./mock-adapter");
    const { alphabetLettersHttpResource } = await import("./http/alphabet");
    const { prayersHttpResource } = await import("./http/prayers");
    const { mediaHttpResource } = await import("./http/media");
    const client = getApiClient();
    expect(client.alphabetLetters).toBe(alphabetLettersHttpResource);
    expect(client.prayers).toBe(prayersHttpResource);
    expect(client.media).toBe(mediaHttpResource);
    expect(client.icons).toBe(mockApiAdapter.icons);
    expect(client.churchInfo).toBe(mockApiAdapter.churchInfo);
  });
});
