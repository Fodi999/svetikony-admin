# Production read-only setup

## PRODUCTION AUTH
Backend lib/d1/auth.ts expects Authorization: Bearer JWT, HS256 signature, exp and role=super_admin. Backend signing secret is ADMIN_JWT_SECRET with JWT_SECRET fallback. Never put that signing secret in the plugin. The plugin consumes SVET_IKONY_ADMIN_TOKEN and SVET_IKONY_API_BASE_URL; sends Accept: application/json and X-Request-ID; rejects redirects. Prior local credential received production HTTP 401. A configured key is not proof of valid authentication.

## SECURITY
Dedicated file: /Users/dmitrijfomin/.config/svetikony/production.env, mode0600, parent0700, outside Git. User must enter an existing valid production service JWT locally after SVET_IKONY_ADMIN_TOKEN=. No token is included in this report or MCP configuration. Plugin configuration contains only the file path, HTTPS origin, read-only flag and separate local journal path. Existing LOCAL .env.local is preserved. This is filesystem protection, not an OS Keychain implementation. The JWT itself has super_admin privileges; read-only is enforced by this client, not by a scoped backend credential.

## WRITE ACCESS
DISABLED for production at MCP write-handler boundary and AdminApi non-GET boundary. No POST/PUT/DELETE tests are sent to production: rejection tests use an in-memory fake. All 33 tools remain discoverable but discovery does not imply permission to execute writes.

## VISUALIZER / TERRAIN
Production reads remain blocked by integrations/svetikony/src/transport.mjs requireLocal, Visualizer class guards, Terrain guards, and backend lib/terrain/http.ts LOCAL policy. Minimal future proposal (not implemented): dedicated GET-only Visualizer allowlist plus read-only class methods; retain every mutation guard. Terrain requires separate review because its backend LOCAL restriction also prevents public production access; no general requireLocal removal is proposed.

## READ TESTS
Run node integrations/svetikony/scripts/production-readonly-check.mjs after entering the JWT. Only connection_status/list_content/get_content are called, backed by GET requests. The script reports credential presence boolean, connection result, tool count and calendar/saints/prayers results, without returning content or secrets. No login POST, migrations, publication, deletion or deployment.

## TOOLS LOADED
Expected33. SDK handshake must verify33. Current chat catalogue remains18 until a fresh thread actually loads the reinstalled plugin; this cannot be certified from SDK enumeration alone.

## NEXT SAFE STEP
User enters JWT in the protected file, then asks for the read-only check. After successful reads, start a new Codex thread and call connection_status plus enumerate available tools. Do not claim connected or new-chat verified before those checks succeed.

## Verified in this session
- Plugin tests:64 passed; build passed; plugin validation passed.
- MCP handshake:33 tools.
- PRODUCTION_KEY_CONFIGURED=false; PRODUCTION_AUTH=FAILED (not configured); remote reads blocked before fetch; WRITE_REQUESTS=0.
- Reinstalled personal plugin:0.1.0+codex.20260911062212.
- New Codex thread not yet tested. No commit/push/deploy performed.
