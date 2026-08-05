const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

const SVET_IKONY_SITE_URL = (process.env.NEXT_PUBLIC_SVET_IKONY_SITE_URL || "").replace(/\/+$/, "");

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
