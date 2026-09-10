import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { entityNames, spec } from "./catalog.mjs";
import { createHash } from "node:crypto";
import { MODEL_KEY, GLB_MIME, MAX_GLB_BYTES } from "./visualizer-glb.mjs";
export function loadConfig() {
  // Read only the two existing admin service settings. Never return credentials.
  const file = process.env.SVETIKONY_ENV_FILE;
  if (!file)
    throw new Error("Set SVETIKONY_ENV_FILE to the existing admin server environment file");
  const vars = parseEnv(readFileSync(file, "utf8"));
  const base = process.env.SVETIKONY_API_ORIGIN || vars.SVET_IKONY_API_BASE_URL;
  const token = vars.SVET_IKONY_ADMIN_TOKEN;
  if (!base || !token) throw new Error("Administrative API configuration is incomplete");
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new Error("API base must be an origin");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    throw new Error("Remote API requires HTTPS");
  return { origin: url.origin, token, environment: local ? "local" : "production" };
}
const roots = entityNames.map((e) => spec(e).path).join("|");
const allowedPath = new RegExp(`^/api/admin/church-content/(${roots})(/[a-zA-Z0-9_-]{1,120})?$`);
const visualPath =
  /^\/api\/admin\/church-content\/visualizer-(events|models)(\/[a-zA-Z0-9_-]{1,120})?$/;
export function requireLocal(config) {
  const url = new URL(config.origin);
  if (
    config.environment !== "local" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Visualizer tools are LOCAL only; production access is disabled");
}
export class AdminApi {
  constructor(config, fetcher = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }
  async terrainRequest(path, { method = "GET", body, mimeType, bundleId } = {}) {
    requireLocal(this.config);
    const root = /^\/api\/admin\/terrain-bundles\/[a-zA-Z0-9_-]{1,80}\/L[123]$/;
    const tile = /^\/api\/admin\/terrain-bundles\/[a-zA-Z0-9_-]{1,80}\/L[123]\/tiles\/\d+_\d+$/;
    const reconcile = /^\/api\/admin\/terrain-bundles\/[a-zA-Z0-9_-]{1,80}\/L[123]\/reconcile$/;
    if (!(
      (root.test(path) && ["GET", "POST"].includes(method)) ||
      (tile.test(path) && method === "PUT") ||
      (reconcile.test(path) && method === "POST")
    ))
      throw new Error("Unsupported terrain route/method");
    const headers = { Authorization: `Bearer ${this.config.token}`, Accept: "application/json" };
    if (mimeType) headers["Content-Type"] = mimeType;
    if (bundleId) headers["X-Terrain-Bundle-ID"] = bundleId;
    let response;
    try {
      response = await this.fetcher(this.config.origin + path, {
        method,
        headers,
        body,
        redirect: "error",
        signal: AbortSignal.timeout(120000),
        cache: "no-store",
      });
    } catch {
      throw new Error("Terrain API unavailable or outcome unknown; reconcile before resume");
    }
    if (!response.ok)
      throw new Error(`Terrain API HTTP ${response.status}; reconcile before resume`);
    return response.json();
  }
  async request(path, { method = "GET", body } = {}) {
    const visual =
      visualPath.test(path) ||
      /^\/api\/admin\/church-content\/visualizer-models\/[a-zA-Z0-9_-]{1,120}\/set-base-earth$/.test(
        path,
      );
    if (visual) {
      requireLocal(this.config);
      if (path.endsWith("/set-base-earth") && method !== "POST")
        throw new Error("Invalid Base Earth method");
      if (method !== "GET" && path.includes("visualizer-events") && body?.status !== "draft")
        throw new Error("Visualizer writes require draft status");
    }
    if (
      !allowedPath.test(path) &&
      !visual &&
      !(path === "/api/admin/media/upload" && method === "POST") &&
      !(path === "/api/admin/media" && method === "GET") &&
      !(path === "/api/admin/telegram/autopost/settings" && method === "GET")
    )
      throw new Error("Route outside editorial scope");
    if (!["GET", "PUT", "POST"].includes(method)) throw new Error("HTTP method not allowed");
    const headers = {
      Authorization: `Bearer ${this.config.token}`,
      Accept: "application/json",
      "X-Request-ID": crypto.randomUUID(),
    };
    if (body !== undefined && !(body instanceof FormData))
      headers["Content-Type"] = "application/json";
    let response;
    try {
      response = await this.fetcher(this.config.origin + path, {
        method,
        headers,
        body:
          body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(45000),
        cache: "no-store",
      });
    } catch {
      throw new Error(
        method === "GET"
          ? "Administrative API unavailable"
          : "Write outcome unknown; inspect the change before any retry",
      );
    }
    if (!response.ok) throw new Error(`Administrative API HTTP ${response.status}`);
    try {
      return await response.json();
    } catch {
      throw new Error(
        method === "GET" ? "Invalid API response" : "Write outcome unknown: invalid response",
      );
    }
  }
  async publicJson(path) {
    requireLocal(this.config);
    if (
      path !== "/api/church/visualizer-models/base-earth" &&
      path !== "/api/church/visualizer-events"
    )
      throw new Error("Unsupported public read route");
    const response = await this.fetcher(this.config.origin + path, {
      redirect: "error",
      signal: AbortSignal.timeout(45000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Public visualizer HTTP ${response.status}`);
    return response.json();
  }
  async modelMedia(key, digest = false) {
    requireLocal(this.config);
    if (!MODEL_KEY.test(key)) throw new Error("Invalid visualizer R2 key");
    // Always this LOCAL origin, never a returned SITE_URL and never a bearer token.
    const url = this.config.origin + "/" + key;
    const response = await this.fetcher(url, {
      method: digest ? "GET" : "HEAD",
      redirect: "error",
      signal: AbortSignal.timeout(45000),
      cache: "no-store",
    });
    const size = Number(response.headers.get("content-length"));
    if (
      !response.ok ||
      response.headers.get("content-type")?.split(";")[0] !== GLB_MIME ||
      !Number.isSafeInteger(size) ||
      size < 20 ||
      size > MAX_GLB_BYTES
    ) {
      await response.body?.cancel();
      throw new Error("R2 object missing or invalid MIME/size");
    }
    const metadata = { key, url, size, mimeType: GLB_MIME, etag: response.headers.get("etag") };
    if (digest) {
      const hash = createHash("sha256");
      let count = 0;
      for await (const chunk of response.body) {
        count += chunk.length;
        if (count > size) throw new Error("R2 body exceeds declared size");
        hash.update(chunk);
      }
      if (count !== size) throw new Error("R2 body length mismatch");
      metadata.sha256 = hash.digest("hex");
    }
    return metadata;
  }
}
