const PALETTE = ["#8b6b4a", "#5b7b6b", "#6b5b8b", "#8b5b6b", "#5b6b8b", "#7b7b5b"];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministic inline SVG placeholder — avoids any network dependency in
 * Stage 1 (mock data must never call out to third-party image hosts).
 */
export function placeholderImage(seed: string, label?: string, width = 480, height = 640): string {
  const color = PALETTE[hashString(seed) % PALETTE.length];
  const text = (label ?? seed).slice(0, 24);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${color}" />
    <rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-family="sans-serif" font-size="22">${text}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
