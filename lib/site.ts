/**
 * Client-safe origin of the public svet-ikony site — used to build
 * absolute links (e.g. the QR-code preview) that mirror what the site
 * itself generates. Falls back to production since this is a build-time
 * NEXT_PUBLIC_* var Cloudflare's Workers Builds pipeline has no way to
 * set (same root cause as lib/api/index.ts's FORCE_MOCK_API flip and
 * lib/media/resolve-preview-url.ts's own fallback).
 */
export const SVET_IKONY_SITE_URL = (process.env.NEXT_PUBLIC_SVET_IKONY_SITE_URL || "https://svetikony.com").replace(/\/+$/, "");
