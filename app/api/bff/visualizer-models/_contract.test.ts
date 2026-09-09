import { describe, expect, it } from "vitest";
import { toBffVisualizerModelDto, toBffVisualizerModelDtoList, type WorkerVisualizerModelDto } from "./_contract";

function workerDto(overrides: Partial<WorkerVisualizerModelDto> = {}): WorkerVisualizerModelDto {
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

describe("toBffVisualizerModelDto", () => {
  it("passes every field through unchanged -- no internal Worker-only fields to drop", () => {
    const worker = workerDto();
    expect(toBffVisualizerModelDto(worker)).toEqual(worker);
  });
});

describe("toBffVisualizerModelDtoList", () => {
  it("maps every item", () => {
    const list = toBffVisualizerModelDtoList([workerDto({ id: "a" }), workerDto({ id: "b" })]);
    expect(list.map((m) => m.id)).toEqual(["a", "b"]);
  });
});
