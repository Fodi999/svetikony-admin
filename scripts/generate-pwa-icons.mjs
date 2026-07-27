// One-off generator for placeholder PWA/app icons. Run with: node scripts/generate-pwa-icons.mjs
// Produces simple, brand-neutral icons so the manifest/installability can be tested in Stage 1.
// Replace with real artwork before Stage 2 production rollout.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");

function iconSvg({ size, padding }) {
  const inner = size - padding * 2;
  const cx = size / 2;
  const barW = inner * 0.16;
  const barH = inner * 0.78;
  const armW = inner * 0.52;
  const armH = inner * 0.16;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#18181b" />
    <rect x="${cx - barW / 2}" y="${padding + inner * 0.08}" width="${barW}" height="${barH}" rx="${barW / 2}" fill="#f4f4f5" />
    <rect x="${cx - armW / 2}" y="${padding + inner * 0.3}" width="${armW}" height="${armH}" rx="${armH / 2}" fill="#f4f4f5" />
  </svg>`;
}

const targets = [
  { file: "public/pwa/icon-192.png", size: 192, padding: 20 },
  { file: "public/pwa/icon-512.png", size: 512, padding: 48 },
  { file: "public/pwa/maskable-512.png", size: 512, padding: 100 },
  { file: "public/pwa/apple-touch-icon.png", size: 180, padding: 22 },
  { file: "public/icons/icon-16.png", size: 16, padding: 1 },
  { file: "public/icons/icon-32.png", size: 32, padding: 3 },
];

for (const target of targets) {
  const svg = iconSvg(target);
  const outPath = path.join(ROOT, target.file);
  await mkdir(path.dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log("wrote", target.file);
}

await writeFile(path.join(ROOT, "public/pwa/icon.svg"), iconSvg({ size: 512, padding: 48 }));
console.log("done");
