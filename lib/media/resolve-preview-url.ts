const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Falls back to the real production site when the build-time env var isn't
 * inlined. Cloudflare's Workers Builds pipeline for this project has no way
 * to set build-time NEXT_PUBLIC_* vars (same root cause as lib/api/index.ts's
 * FORCE_MOCK_API flip) — a runtime `wrangler secret put` never reaches the
 * compiled client bundle, so without this fallback every preview silently
 * fell back to the raw-key text in production. Overridden locally via
 * .env.local (http://localhost:3001).
 */
const SVET_IKONY_SITE_URL = (process.env.NEXT_PUBLIC_SVET_IKONY_SITE_URL || "https://svetikony.com").replace(/\/+$/, "");

/**
 * Turns an R2 object key (e.g. "media/products/x/gallery/uuid.png", as
 * returned by MediaUploadButton's `id`) into a displayable `<img src>`.
 *
 * A freshly-uploaded-this-session file already gets a resolved `url` from
 * the upload response — this is only needed for a key that was persisted
 * in an *earlier* session (editing an existing record), where all the form
 * ever has is the bare key. Without it, the media tab in Calendar Day/
 * Category/Product forms can only preview brand-new uploads and shows a
 * raw key string for anything already saved.
 *
 * Mirrors svet-ikony's own lib/media/resolver.ts `resolveMediaUrl()` —
 * kept as a separate, admin-local copy rather than a cross-repo import,
 * since these are two independently deployed Next.js apps.
 */
export function resolveMediaPreviewUrl(key: string | undefined): string | undefined {
  if (!key) return undefined;
  const trimmed = key.trim();
  if (!trimmed) return undefined;
  if (HAS_SCHEME.test(trimmed) || trimmed.startsWith("//")) return trimmed;
  if (!SVET_IKONY_SITE_URL) return undefined;
  return `${SVET_IKONY_SITE_URL}/${trimmed.replace(/^\/+/, "")}`;
}
