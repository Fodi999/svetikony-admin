import { afterEach, describe, expect, it, vi } from "vitest";
import { visualizerModelsHttpResource } from "./visualizer-models";

function dto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "model-1",
    eventGroupId: "group-1",
    title: "Kyiv 988",
    r2Key: "media/visualizer/group-1/model/00000000-0000-4000-8000-000000000000.glb",
    filename: "kyiv_988.glb",
    mimeType: "model/gltf-binary",
    fileSize: 4_200_000,
    isBaseEarth: false,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("visualizerModelsHttpResource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("list forwards eventGroupId as a query param", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([dto()]));
    vi.stubGlobal("fetch", fetchMock);
    const models = await visualizerModelsHttpResource.list({ eventGroupId: "group-1" });
    expect(models).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/bff/visualizer-models?eventGroupId=group-1");
  });

  it("list with no query fetches the unfiltered collection (used by the Base Earth Model card)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([dto({ isBaseEarth: true, eventGroupId: null })]));
    vi.stubGlobal("fetch", fetchMock);
    const models = await visualizerModelsHttpResource.list();
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/bff/visualizer-models");
    expect(models[0].isBaseEarth).toBe(true);
  });

  it("create POSTs the given r2Key/eventGroupId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto(), 201));
    vi.stubGlobal("fetch", fetchMock);
    const model = await visualizerModelsHttpResource.create({ eventGroupId: "group-1", r2Key: dto().r2Key });
    expect(model.eventGroupId).toBe("group-1");
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.eventGroupId).toBe("group-1");
    expect(body.r2Key).toBe(dto().r2Key);
  });

  it("remove DELETEs without a force param by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await visualizerModelsHttpResource.remove("model-1");
    expect(fetchMock).toHaveBeenCalledWith("/api/bff/visualizer-models/model-1", expect.objectContaining({ method: "DELETE" }));
  });

  it("remove appends ?force=1 when options.force is true", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await visualizerModelsHttpResource.remove("model-1", { force: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/bff/visualizer-models/model-1?force=1", expect.objectContaining({ method: "DELETE" }));
  });

  it("setBaseEarth POSTs to the set-base-earth sub-route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(dto({ isBaseEarth: true })));
    vi.stubGlobal("fetch", fetchMock);
    const model = await visualizerModelsHttpResource.setBaseEarth("model-1");
    expect(model.isBaseEarth).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/bff/visualizer-models/model-1/set-base-earth", expect.objectContaining({ method: "POST" }));
  });
});
