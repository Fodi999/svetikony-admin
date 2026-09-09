/**
 * The stable BFF contract for Visualizer Models (GLB 3D-model metadata).
 * Mirrors svet-ikony's lib/d1/repositories/visualizerModels.ts's
 * ChurchVisualizerModelDto exactly.
 */
export interface WorkerVisualizerModelDto {
  id: string;
  eventGroupId: string | null;
  title: string;
  r2Key: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  isBaseEarth: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** No fields dropped — every column here is already admin-relevant, unlike
 * the content modules' internal siteId/isGlobal fields. `r2Key` is a bare
 * R2 key (Saints/Alphabet-photo convention), resolved to a displayable/
 * loadable URL client-side via resolveMediaPreviewUrl(), not here. */
export type BffVisualizerModelDto = WorkerVisualizerModelDto;

export function toBffVisualizerModelDto(worker: WorkerVisualizerModelDto): BffVisualizerModelDto {
  return worker;
}

export function toBffVisualizerModelDtoList(workers: WorkerVisualizerModelDto[]): BffVisualizerModelDto[] {
  return workers.map(toBffVisualizerModelDto);
}

/** Admin -> Worker payload for create/update. `r2Key` comes from a prior
 * upload via the existing generic media-upload BFF route (module:
 * "visualizer", purpose: "model") — this route only ever persists metadata
 * pointing at an already-uploaded object, it never receives the binary
 * itself. */
export interface WorkerVisualizerModelWritePayload {
  eventGroupId?: string | null;
  title?: string;
  r2Key?: string;
  filename?: string;
  mimeType?: string;
  fileSize?: number;
  sortOrder?: number;
}
