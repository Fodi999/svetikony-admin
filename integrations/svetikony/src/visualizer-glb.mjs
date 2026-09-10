import { openSync, closeSync, fstatSync, readFileSync, realpathSync } from "node:fs";
import { basename, extname, sep } from "node:path";
import { createHash } from "node:crypto";
export const GLB_MIME = "model/gltf-binary";
export const MAX_GLB_BYTES = 50 * 1024 * 1024;
export const MODEL_KEY = /^media\/visualizer\/[a-zA-Z0-9_-]{1,120}\/model\/[a-f0-9-]+\.glb$/;
// Same GLB v2 / embedded-resource contract as lib/media/glb.ts in the Worker.
export function validateGlb(bytes) {
  if (
    bytes.length < 20 ||
    bytes.length > MAX_GLB_BYTES ||
    bytes.readUInt32LE(0) !== 0x46546c67 ||
    bytes.readUInt32LE(4) !== 2 ||
    bytes.readUInt32LE(8) !== bytes.length
  )
    throw new Error("Invalid GLB v2 header or file size");
  const length = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a || !length || length % 4 || 20 + length > bytes.length)
    throw new Error("Invalid GLB JSON chunk");
  let doc;
  try {
    doc = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(20, 20 + length)),
    );
  } catch {
    throw new Error("Invalid GLB JSON");
  }
  if (doc?.asset?.version !== "2.0") throw new Error("Expected glTF 2.0");
  for (const name of ["buffers", "images"]) {
    if (doc[name] !== undefined && !Array.isArray(doc[name]))
      throw new Error("Invalid GLB resources");
    for (const resource of doc[name] ?? []) {
      if (
        !resource ||
        (resource.uri !== undefined &&
          (typeof resource.uri !== "string" || (resource.uri && !resource.uri.startsWith("data:"))))
      )
        throw new Error("GLB resources must be embedded");
    }
  }
  let offset = 20 + length;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) throw new Error("Truncated GLB chunk");
    const size = bytes.readUInt32LE(offset);
    if (size % 4 || offset + 8 + size > bytes.length) throw new Error("Invalid GLB chunk length");
    offset += 8 + size;
  }
  return doc;
}
export function readGlb(path, roots, mimeType = GLB_MIME) {
  if (![GLB_MIME, "application/octet-stream"].includes(mimeType))
    throw new Error("Unsupported GLB MIME");
  const real = realpathSync(path);
  if (
    !roots.some((root) => {
      try {
        const r = realpathSync(root);
        return real.startsWith(r + sep);
      } catch {
        return false;
      }
    })
  )
    throw new Error("File outside allowed upload roots");
  if (extname(path).toLowerCase() !== ".glb" || extname(real).toLowerCase() !== ".glb")
    throw new Error("Expected .glb extension");
  const fd = openSync(real, "r");
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size < 20 || stat.size > MAX_GLB_BYTES)
      throw new Error("GLB must be a regular file of at most 50 MiB");
    const bytes = readFileSync(fd);
    validateGlb(bytes);
    return {
      bytes,
      filename: basename(real).slice(0, 200),
      size: bytes.length,
      mimeType: GLB_MIME,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } finally {
    closeSync(fd);
  }
}
