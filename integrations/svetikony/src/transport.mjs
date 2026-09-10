import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { entityNames, spec } from "./catalog.mjs";
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
export class AdminApi {
  constructor(config, fetcher = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }
  async request(path, { method = "GET", body } = {}) {
    if (
      !allowedPath.test(path) &&
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
}
