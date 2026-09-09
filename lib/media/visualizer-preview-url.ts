/** Same-origin authenticated preview: no cross-origin fetch/CORS or exposed token. */
export function visualizerPreviewUrl(id: string, version?: string) {
  return `/api/bff/visualizer-models/${encodeURIComponent(id)}/file${version ? `?v=${encodeURIComponent(version)}` : ""}`;
}
