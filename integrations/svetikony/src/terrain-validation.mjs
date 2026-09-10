import { readFileSync, realpathSync, statSync, readdirSync } from "node:fs";
import { dirname, join, sep, extname } from "node:path";
import { createHash } from "node:crypto";
import {
  parseTerrainManifest,
  remoteTerrainManifest,
  terrainPrefix,
  MAX_TERRAIN_MANIFEST_BYTES,
  validateTerrainGlbMetadata,
} from "./terrain-contract.ts";
import { readGlb, validateGlb } from "./visualizer-glb.mjs";
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function validateTerrainFiles(manifestPath, roots, { capture = false } = {}) {
  const path = realpathSync(manifestPath),
    root = dirname(path);
  if (
    extname(path).toLowerCase() !== ".json" ||
    !roots.some((r) => {
      try {
        return path.startsWith(realpathSync(r) + sep);
      } catch {
        return false;
      }
    })
  )
    throw new Error("Manifest outside allowed roots or not .json");
  const stat = statSync(path);
  if (!stat.isFile() || stat.size > MAX_TERRAIN_MANIFEST_BYTES)
    throw new Error("Invalid manifest file/size");
  const bytes = readFileSync(path);
  if (bytes.length > MAX_TERRAIN_MANIFEST_BYTES) throw new Error("Manifest exceeds 1 MiB");
  const m = parseTerrainManifest(
    JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(bytes)),
  );
  const files = [],
    payloads = new Map();
  for (const t of m.tiles) {
    const filePath = join(root, t.file);
    if (!realpathSync(filePath).startsWith(root + sep))
      throw new Error("Tile escapes manifest directory");
    const f = readGlb(filePath, [root], t.mimeType ?? "model/gltf-binary");
    if (f.size !== t.file_size_bytes || f.sha256 !== t.sha256)
      throw new Error("Tile size/SHA-256 mismatch: " + t.tile_id);
    validateTerrainGlbMetadata(validateGlb(f.bytes), t);
    files.push({
      tileId: t.tile_id,
      file: t.file,
      x: t.x,
      y: t.y,
      lod: t.lod,
      size: f.size,
      mimeType: f.mimeType,
      sha256: f.sha256,
    });
    if (capture) payloads.set(`${t.x}_${t.y}`, f.bytes);
  }
  const named = new Set(m.tiles.map((t) => t.file));
  const extra = readdirSync(root).filter((f) => /\.glb$/i.test(f) && !named.has(f));
  if (extra.length) throw new Error("Unlisted GLB files in bundle directory: " + extra.join(", "));
  const manifest = remoteTerrainManifest(m),
    manifestBytes = Buffer.from(JSON.stringify(manifest));
  const remoteSha = sha256(manifestBytes),
    prefix = terrainPrefix(m.region, m.grid.lod);
  return {
    manifestPath: path,
    sourceManifestSha256: sha256(bytes),
    manifest,
    manifestSha256: remoteSha,
    bundleId: remoteSha,
    region: m.region,
    lod: m.grid.lod,
    prefix,
    manifestKey: prefix + "manifest.json",
    tileCount: files.length,
    totalBytes: files.reduce((n, f) => n + f.size, 0),
    manifestSize: manifestBytes.length,
    files: files.map((f) => ({ ...f, r2Key: prefix + `${f.x}_${f.y}.glb` })),
    ...(capture ? { payloads, manifestBytes } : {}),
  };
}
