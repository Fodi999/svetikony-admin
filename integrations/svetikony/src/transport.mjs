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
  if (!base) throw new Error("Administrative API origin is not configured");
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new Error("API base must be an origin");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    throw new Error("Remote API requires HTTPS");
  return { origin: url.origin, token, environment: local ? "local" : "production", readOnly: !local || process.env.SVETIKONY_READ_ONLY === "true" || vars.SVETIKONY_READ_ONLY === "true" };
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
  #ai = null;
  #paired = false;
  get delegated(){return this.#paired;}
  delegatedInfo(){if(!this.#ai||Date.parse(this.#ai.expiresAt)<=Date.now()){this.#ai=null;throw new Error("AI access expired or disconnected; pair again");}return {mode:this.#ai.mode,scopes:[...this.#ai.scopes],expiresAt:this.#ai.expiresAt};}
  async connectAiAccess(pairingCode){
    if(!/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){2}$/.test(pairingCode))throw new Error("Invalid pairing code");
    const origin=new URL(this.config.origin);if(origin.protocol!=="https:"&&!['localhost','127.0.0.1','[::1]'].includes(origin.hostname))throw new Error("HTTPS required");
    let response;try{response=await this.fetcher(origin.origin+'/api/ai-access/exchange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pairingCode}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});}catch{throw new Error("Pairing outcome unknown; create a new code in admin before retrying");}
    if(!response.ok)throw new Error('Pairing rejected: HTTP '+response.status);
    let data;try{data=await response.json();}catch{throw new Error('Invalid pairing response');}
    if(!/^ai_[a-f0-9]{64}$/.test(data.accessToken)||!['READ_ONLY','DRAFT_EDIT'].includes(data.mode)||!Array.isArray(data.scopes)||data.scopes.some(s=>typeof s!=='string')||!Number.isFinite(Date.parse(data.expiresAt))||Date.parse(data.expiresAt)<=Date.now()||Date.parse(data.expiresAt)>Date.now()+7200000)throw new Error('Invalid pairing response');
    this.#ai=data;this.#paired=true;return {connected:true,...this.delegatedInfo()};
  }
  assertAiScope(scope){const info=this.delegatedInfo();if(!info.scopes.includes(scope))throw new Error('AI scope denied: '+scope);}
  async aiRequest(path,{method='GET',body,headers={}}={}){
    this.delegatedInfo();
    let response;try{response=await this.fetcher(this.config.origin+path,{method,headers:{Authorization:'Bearer '+this.#ai.accessToken,...(!(body instanceof FormData)?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:body instanceof FormData||body instanceof ArrayBuffer||ArrayBuffer.isView(body)?body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(45000)});}catch{throw new Error(method==='GET'?'AI API unavailable':'AI write outcome unknown; reconcile before retry');}
    if(response.status===401){this.#ai=null;throw new Error('AI access expired or revoked; pair again');}
    if(!response.ok)throw new Error('AI API HTTP '+response.status);
    try{return await response.json();}catch{throw new Error('Invalid AI API response');}
  }
  async aiStatus(){return this.aiRequest('/api/ai-access/status');}
  async delegatedRequest(path,{method='GET',body}={}){
    const info=this.delegatedInfo();if(!['GET','POST','PUT'].includes(method))throw new Error('AI operation unavailable');
    if(method!=='GET'&&info.mode!=='DRAFT_EDIT')throw new Error('WRITE ACCESS DISABLED');
    if(path==='/api/admin/telegram/autopost/settings'&&method==='GET')return this.aiRequest('/api/ai-access/autopost');
    if(path==='/api/admin/media/upload'&&method==='POST'){this.assertAiScope('media.upload');this.assertAiScope('r2.upload');return this.aiRequest('/api/ai-access/media/upload',{method,body});}
    if(path==='/api/admin/media'&&method==='GET'){this.assertAiScope('media.read');this.assertAiScope('r2.read');return this.aiRequest('/api/ai-access/media');}
    const match=path.match(/^\/api\/admin\/church-content\/([a-z-]+)(?:\/([a-zA-Z0-9_-]{1,120}))?$/);
    if(!match)throw new Error('AI route outside allowlist');
    if(['visualizer-events','visualizer-models'].includes(match[1])){this.assertAiScope('visualizer.'+(method==='GET'?'read':'write'));return this.aiRequest('/api/ai-access/visualizer/'+(match[1]==='visualizer-events'?'events':'models')+(match[2]?'/'+match[2]:''),{method,body});}
    const entity=entityNames.find(e=>spec(e).path===match[1]);if(!entity)throw new Error('AI module unavailable');
    this.assertAiScope(entity+(method==='GET'?'.read':'.write'));
    if(body?.status&&body.status!=='draft')throw new Error('Publication unavailable');
    return this.aiRequest('/api/ai-access/content/'+entity+(match[2]?'/'+match[2]:''),{method,body});
  }

  constructor(config, fetcher = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }
  async terrainRequest(path, { method = "GET", body, mimeType, bundleId } = {}) {
    if(this.delegated){
      if(!/^\/api\/admin\/terrain-bundles\/[a-zA-Z0-9_-]{1,80}\/L[123](?:\/tiles\/\d+_\d+|\/reconcile)?$/.test(path)||!['GET','POST','PUT'].includes(method))throw new Error('AI terrain route unavailable');
      this.assertAiScope(method==='GET'?'terrain.read':'terrain.upload');this.assertAiScope(method==='GET'?'r2.read':'r2.upload');if(method!=='GET'&&this.delegatedInfo().mode!=='DRAFT_EDIT')throw new Error('WRITE ACCESS DISABLED');
      return this.aiRequest(path.replace('/api/admin/terrain-bundles','/api/ai-access/terrain'),{method,body,headers:{...(mimeType?{'Content-Type':mimeType}:{}),...(bundleId?{'X-Terrain-Bundle-ID':bundleId}:{})}});
    }
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
    if(this.delegated)return this.delegatedRequest(path,{method,body});
    if ((this.config.readOnly || this.config.environment === "production") && method !== "GET")
      throw new Error("WRITE ACCESS DISABLED: read-only connection");
    if (!this.config.token) throw new Error("Production credential is not configured");
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
    if(this.delegated){this.assertAiScope('visualizer.read');if(path==='/api/church/visualizer-models/base-earth')return this.aiRequest('/api/ai-access/visualizer/base-earth');if(path==='/api/church/visualizer-events')return (await this.aiRequest('/api/ai-access/visualizer/events')).filter(e=>e.status==='published');throw new Error('AI public route unavailable');}
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
    if(this.delegated){this.assertAiScope("visualizer.read");this.assertAiScope("r2.read");}else requireLocal(this.config);
    if (!MODEL_KEY.test(key)) throw new Error("Invalid visualizer R2 key");
    // Always this LOCAL origin, never a returned SITE_URL and never a bearer token.
    const url = this.config.origin + (this.delegated?"/api/ai-access/model-media?key="+encodeURIComponent(key):"/"+key);
    const response = await this.fetcher(url, {
      method: digest ? "GET" : "HEAD",
      headers: this.delegated?{Authorization:"Bearer "+this.#ai.accessToken}:undefined,
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
