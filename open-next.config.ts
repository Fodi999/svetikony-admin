// Reconstructed from the confirmed production binding NEXT_INC_CACHE_R2_BUCKET
// (r2_bucket, bucket svetikony-admin-opennext-cache) -- this is the exact,
// conventional binding name @opennextjs/cloudflare's own r2-incremental-cache
// override expects, matching the standard scaffold this project's frozen
// origin/cloudflare/workers-autoconfig branch was generated from. Not
// independently verified against the actual deployed bundle's source --
// see the audit report for what this claim rests on.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
