# AI delegated access — implementation and local validation

> Historical initial-phase report. Production was activated in a later approved phase. Current status and remaining gates: [AI_ACCESS_STABILITY_REPORT.md](AI_ACCESS_STABILITY_REPORT.md).

## ARCHITECTURE
The existing human admin session authorizes grants through the BFF. The backend issues a separate opaque, scoped AI credential through a one-time pairing code. Telegram login, admin_session and ADMIN_JWT_SECRET remain unchanged. There is no cookie extraction or session-to-JWT exchange.

## DATABASE
Migration 0020_ai_delegated_access.sql adds grants, hashed pairing codes, hashed tokens, activity and rate limits. Applied locally only. Production migration remains a separately approved prerequisite.

## AI ACCESS UI
/ai-access provides UK/RU/EN, READ_ONLY/DRAFT_EDIT, module selection, 15/30/60/120-minute grants, pairing renewal, connection status, activity and revocation. The page and BFF require settings edit access; backend rechecks the human super_admin session. Browser visual verification was blocked by the existing local authentication gate.

## PAIRING
Cryptographically random codes expire after two minutes and are consumed atomically once. Exchange is rate limited. Only hashes are stored in D1.

## PLUGIN CONNECTION
connect_ai_access is the 34th MCP tool. A fresh local SDK process confirmed 34 tools and the complete grant/pair/read/draft/revoke chain. The installed Codex chat tool catalogue has not been reloaded or verified. Existing production profile does not make undeployed endpoints available.

## SCOPES
Backend enforces module read/write/upload permissions and draft-only mutations. Legacy service authentication remains separate. Delegated sessions cannot publish, delete, deploy, replace Base Earth or fall back to legacy credentials after expiry/revocation.

## TOKEN STORAGE
Opaque tokens exist only in plugin process memory. Token values are not included in tool results or reports. No production credential was changed.

## REVOCATION
Each request checks persisted token/grant expiry, revocation and the owner's current role. The local E2E confirmed the next read fails immediately after revocation.

## ACTIVITY LOG
Grant owner can read bounded activity records containing module, operation, target, status and time, without credentials or request payloads.

## SECURITY
Production data, auth secrets and Telegram flow were not modified. No production migration, publication or deploy was performed. Existing terrain validation, explicit approval and reconciliation remain required; Base Earth is unchanged.

## TESTS
Backend: 1045 tests. Admin: 527 tests. Plugin: 67 tests. Local E2E verified calendar read, harmless prayer draft/readback, activity and revocation. Both repositories passed typecheck and production builds; the plugin bundle build passed. No deployment command was run.

## FILES CHANGED
Backend: lib/ai-access, app/api/ai-access, app/api/admin/ai-access, migration 0020.
Admin: AI access page/BFF, central route policy and manifest regression test, navigation and i18n.
Plugin: transport, server registration, visualizer/terrain delegated routing, bundled server, tests and local E2E script; prior read-only configuration and credential-search reports are retained.

## DEFERRED
PUBLISH mode, delegated Base Earth replacement, audio uploads, visualizer calendar linking, production public terrain rendering, production rollout/migration and browser visual acceptance remain outside the validated MVP. Production activation requires separate approval, then migration/backend/admin rollout and read-only acceptance before any grant permitting draft writes.
