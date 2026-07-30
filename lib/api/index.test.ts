import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEY = "NEXT_PUBLIC_FORCE_MOCK_API";

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

  it("defaults to the real HttpApiAdapter when the flag is unset", async () => {
    delete process.env[ENV_KEY];
    const { getApiClient } = await import("./index");
    const { mockApiAdapter } = await import("./mock-adapter");
    const { alphabetLettersHttpResource } = await import("./http/alphabet");
    const client = getApiClient();
    expect(client.alphabetLetters).toBe(alphabetLettersHttpResource);
    expect(client).not.toBe(mockApiAdapter);
  });

  it("defaults to the real HttpApiAdapter for any value other than the literal string 'true'", async () => {
    process.env[ENV_KEY] = "1";
    const { getApiClient } = await import("./index");
    const { alphabetLettersHttpResource } = await import("./http/alphabet");
    const client = getApiClient();
    expect(client.alphabetLetters).toBe(alphabetLettersHttpResource);
  });

  it("forces the mock adapter when set to 'true'", async () => {
    process.env[ENV_KEY] = "true";
    const { getApiClient } = await import("./index");
    const { mockApiAdapter } = await import("./mock-adapter");
    expect(getApiClient()).toBe(mockApiAdapter);
  });

  it("switches alphabetLetters, prayers, calendarDays, and media to the real HTTP resource by default, leaving other resources on mock", async () => {
    delete process.env[ENV_KEY];
    const { getApiClient } = await import("./index");
    const { mockApiAdapter } = await import("./mock-adapter");
    const { alphabetLettersHttpResource } = await import("./http/alphabet");
    const { prayersHttpResource } = await import("./http/prayers");
    const { calendarDaysHttpResource } = await import("./http/calendar-days");
    const { mediaHttpResource } = await import("./http/media");
    const client = getApiClient();
    expect(client.alphabetLetters).toBe(alphabetLettersHttpResource);
    expect(client.prayers).toBe(prayersHttpResource);
    expect(client.calendarDays).toBe(calendarDaysHttpResource);
    expect(client.media).toBe(mediaHttpResource);
    expect(client.icons).toBe(mockApiAdapter.icons);
    expect(client.churchInfo).toBe(mockApiAdapter.churchInfo);
  });
});
