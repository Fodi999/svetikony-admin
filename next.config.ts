import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  /* config options here */
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
