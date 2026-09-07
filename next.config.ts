import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

/**
 * Phase 1B.1 built this keyed on NEXT_PUBLIC_FORCE_MOCK_API; Phase 1B.2
 * re-keys it on NODE_ENV === "production" instead, and deliberately
 * decouples it from the flag entirely. Reasoning: the hard security
 * invariant as of Phase 1B.2 is "a production build can never activate
 * mock auth, regardless of any flag" (see lib/api/index.ts's
 * `canUseMock`) — `next build`/`next start` always set NODE_ENV=production
 * themselves, a Next.js CLI invariant no env var overrides, so keying
 * this plugin on the same signal makes it a genuinely INDEPENDENT second
 * enforcement of the identical invariant: even a hypothetical future bug
 * in getApiClient()'s own JS-level branch could not resurrect the
 * plaintext demo credentials in a production build's output, because the
 * real file is never read by the compiler at all whenever NODE_ENV is
 * "production" — full stop, no flag can opt back in. See
 * lib/mock-data/users.production-stub.ts's own doc comment for why relying
 * on dead-code elimination alone (a conditional `require()`, a
 * NODE_ENV-gated next/dynamic import) was insufficient on its own —
 * confirmed empirically by rebuilding and grepping .next/static/ +
 * .next/server/ after each attempt during Phase 1B.1.
 */
/**
 * Phase 1D.2 production security headers. Gated on NODE_ENV === "production"
 * (same signal the rest of this file already uses -- see the
 * NormalModuleReplacementPlugin above) so `next dev` is never affected:
 * CSP without 'unsafe-eval' would break React's dev-mode stack-trace eval,
 * and there's no reason to risk that friction when these headers only
 * matter for real deployments anyway.
 *
 * CSP is a baseline policy, not a nonce-based strict CSP -- deliberately.
 * A real production build was inspected directly (curled a live `next
 * start` response) to find what it actually needs, rather than guessing:
 * Next.js App Router's own RSC payload streaming injects multiple inline
 * `<script>self.__next_f.push(...)</script>` tags per response, each with
 * different, per-request content -- these can't be allowlisted by a fixed
 * hash, and the alternative (nonce-based CSP) requires Proxy-generated
 * nonces plus forcing every page into dynamic rendering site-wide (see
 * node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md),
 * a materially larger, separate effort. `script-src` and `style-src`
 * therefore carry 'unsafe-inline' (style-src also needs it for this app's
 * 3 real `style={{...}}` PWA safe-area-inset attributes -- inline style
 * *attributes*, unlike inline `<script>` tags, have no per-value hash
 * mechanism with broad browser support either). This is a REAL residual
 * risk, not a solved problem: with 'unsafe-inline' present, a successful
 * HTML-injection vulnerability elsewhere could still execute inline
 * script. What this baseline DOES meaningfully stop: loading any
 * externally-hosted script (script-src has no origin but 'self'), and
 * framing this app at all. `connect-src 'self'` is also a real, checked
 * guarantee: every fetch in this codebase targets a relative /api/bff/*
 * path (lib/api/http/transport.ts, lib/api/http/media.ts) -- the browser
 * never calls svet-ikony directly -- so this CSP directive enforces that
 * architecture invariant at the browser level too, not just by code
 * review. `img-src` allows any https: host (not just 'self'), matching
 * this app's own resolveMediaPreviewUrl(), which already renders any
 * absolute-URL media key unchanged -- a stricter img-src would just break
 * real previews, not add security this app doesn't already forgo by
 * design.
 */
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https: data:",
      "font-src 'self'",
      "connect-src 'self'",
      "worker-src 'self'",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "frame-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No camera/mic/geolocation/payment/usb use anywhere in this codebase
  // (checked directly, not assumed) -- explicitly denied as defense in
  // depth. Nothing else is restricted: Permissions-Policy only takes away
  // features it lists, so anything unlisted keeps its normal default.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Legacy fallback for any CSP-unaware context; frame-ancestors above is
  // the real, modern mechanism. This admin panel has no legitimate
  // embedding use case (grepped for iframe/embed usage -- none), so
  // denying framing entirely is safe.
  { key: "X-Frame-Options", value: "DENY" },
  // No includeSubDomains/preload: this app does not control every
  // subdomain of its own deployment domain, and preload is a one-way,
  // hard-to-reverse commitment. 180 days is long enough to matter, short
  // enough to not be a permanent mistake if this decision is revisited.
  // Safe to send unconditionally within this production-only block:
  // browsers only ever honor HSTS on a response actually received over
  // HTTPS, so this has no effect on a plain-HTTP request even if one
  // somehow reaches this far.
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
];

const nextConfig: NextConfig = {
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
  webpack: (config, { webpack }) => {
    if (process.env.NODE_ENV === "production") {
      // NormalModuleReplacementPlugin, not `resolve.alias`: it matches
      // against the already-resolved module *path* (after Next's own
      // tsconfig-paths handling has turned `@/lib/mock-data/users` into an
      // absolute file path), so it works regardless of which resolution
      // mechanism got there first -- confirmed necessary empirically, see
      // lib/mock-data/users.production-stub.ts's doc comment.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/lib[\\/]mock-data[\\/]users(\.ts)?$/, (resource: { request: string }) => {
          resource.request = path.join(process.cwd(), "lib/mock-data/users.production-stub.ts");
        }),
      );
    }
    return config;
  },
};

/**
 * @serwist/next's own `public/**\/*` scan (via `globPublicPatterns`) has no
 * way to exclude specific files: the installed `glob` version does not
 * support inline `!negation` mixed into a patterns array (verified
 * directly — `glob@13`'s array form only unions positive patterns), and
 * `manifestTransforms` never sees these entries at all (@serwist/next
 * passes them straight through as `additionalPrecacheEntries`, which its
 * webpack plugin adds to the manifest without running transforms on them —
 * both confirmed by inspecting node_modules/@serwist/next/dist/index.mjs).
 *
 * So this replicates that same scan itself, the only difference being a
 * working `ignore` option, and supplies the result as `additionalPrecacheEntries`
 * directly — which makes @serwist/next skip its own (unfilterable) scan.
 *
 * Why this is needed at all: the Cloudflare Workers build pipeline drops
 * its own `_headers`/`_redirects` config files into `public/`. Those
 * aren't real fetchable assets — Cloudflare's static-asset layer consumes
 * them at deploy time — so a deployed service worker that tries to
 * precache them gets a 404 and throws `bad-precaching-response` on
 * install, breaking the PWA for every visitor until they clear the SW.
 */
function publicPrecacheEntries(): { url: string; revision: string }[] {
  const publicDir = path.join(process.cwd(), "public");
  return globSync("**/*", {
    nodir: true,
    follow: true,
    cwd: publicDir,
    ignore: ["sw.js", "sw.js.map", "swe-worker-*.js", "_headers", "_redirects"],
  }).map((file) => ({
    url: path.posix.join("/", file),
    revision: crypto.createHash("sha1").update(fs.readFileSync(path.join(publicDir, file))).digest("hex"),
  }));
}

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // A forced reload on the browser's "online" event can land exactly while a
  // user is mid-navigation (e.g. right after login) and bounce them back.
  // Our own ConnectionStatus indicator + TanStack Query refetching cover the
  // "back online" case without a disruptive full-page reload.
  reloadOnOnline: false,
  additionalPrecacheEntries: process.env.NODE_ENV === "development" ? [] : publicPrecacheEntries(),
});

export default withSerwist(nextConfig);
