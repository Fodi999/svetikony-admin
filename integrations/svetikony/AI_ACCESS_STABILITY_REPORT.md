# AI Access stability audit — 2026-09-11

## AI ACCESS ARCHITECTURE

Telegram human login → HttpOnly admin_session → web-admin BFF → super_admin grant → single-use pairing code → opaque AI token → /api/ai-access allowlisted API. Existing human auth and BFF service credential architecture retained. No cookie extraction, session-to-JWT exchange or new permanent credential. No production changes, commit, push or deploy during this stabilization phase.

Production activation/migration happened in the separately approved previous phase. The backend/admin fixes below are LOCAL ONLY, not deployed.

## PLUGIN

Installed `svetikony@personal`, version `0.1.0+codex.20260911074641`.
Fresh SDK stdio handshake against the installed cache bundle: **34/34**, including connect_ai_access. Before pairing: production, connected=false, AI_PAIRING_REQUIRED, writeAccess=DISABLED, publication=DISABLED, serviceIdentity=false. No production HTTP request is needed for this discovery check.

The previously open Codex chat has the old catalog. A new UI chat still needs acceptance verification; SDK discovery does not prove the UI chat loaded the tools. Installed source: ~/plugins/svetikony; cache: ~/.codex/plugins/cache/personal/svetikony/0.1.0+codex.20260911074641.

## SECURITY CHECK

Pairing expires after two minutes and is consumed atomically once. Tokens are random opaque credentials, checked for expiry, grant revocation, owner role and environment on requests. D1 stores SHA-256 hashes of pairing codes and tokens, not plaintext credentials. Rate limiting applies to exchange. Plugin holds its token in a private in-memory field; no token in proposal SQLite, env files, error bodies or activity. Expiry/revoke/restart requires pairing again. Redirects cannot forward credentials to a different endpoint.

Fixed production legacy service-auth fallback: explicit production origin no longer reads the old credential file; production requests require delegated pairing. Failed reconnection clears prior delegated state. No debug bypass or test credential added to runtime. Local fixture credentials remain isolated in the explicitly LOCAL test harness. Hostnames in the installed profile are configuration; LOCAL test harness ports are not production fallbacks.

Automated negative tests verify secret-safe errors, no fallback, expiry, scopes and revocation. This is a scoped code/test audit, not a claim of exhaustive penetration testing.

## DRAFT_EDIT ENFORCEMENT

Backend enforces modes/scopes, draft status and fixed entity identity; plugin checks additionally. In-memory integration tests apply real migrations and create/update all seven editorial types. Fixed Gospel table name, icon gallery arrays, calendar AI image metadata and nullable SEO. Required fields and relation language validated. Atomic draft UPDATE guard prevents changing a record published between validation and write.

READ_ONLY refuses writes even with overbroad stored scopes. DRAFT_EDIT does not permit publish, permanent delete, deploy, migration, secrets, auth changes or arbitrary SQL. Published records remain protected. Media upload now explicitly checks DRAFT_EDIT. Visualizer model metadata validation improved. Base Earth replacement remains disabled for delegated access. Visualizer-calendar links remain deferred to avoid unintended Telegram autopost; audio upload is unsupported. Calendar writes retain autopost guard.

Terrain retains validation/approval/no-overwrite/resume/reconcile. Reconcile can finalize completion metadata: tool is now correctly marked as a write and requires upload permission. Storage completion does not enable production public /terrain rendering, which remains LOCAL-only.

Known concurrency limit: draft-status guard is atomic, but there is no full optimistic version CAS against simultaneous edits of the same draft. Avoid concurrent CMS and plugin edits of that record.

## REVOCATION

Automated real LOCAL MCP flow passed: unauthenticated denied → READ_ONLY fixture grant → pairing → calendar read (32) → revoke → immediate subsequent read denied. Production writes: 0. No test draft created in this run. Fixture user disabled and session/grant revoked; rows retained, no deletion.

## ACTIVITY LOG

Time, module, action, entity/type and success/failure rendered. Added safe scope-denied records and failure records for media/terrain errors. Visualizer create logs now include actual created ID and entity type. Admin read errors clear on successful retry; active connected grant can issue a fresh pairing code for another process. No Authorization headers or credentials are included in activity payloads.

## PRODUCTION READ TEST

Previously confirmed production counts: Calendar 34, Saints 31, Prayers 65. At 07:46 UTC on 2026-09-11, the original verification process still reported connected=true; token expires 07:59:52 UTC (09:59 Warsaw).

**Post-reinstall three-list smoke is pending.** New installed process intentionally has no token. The old verification process only exposes status/close after its original read sequence; its private token was not extracted or transferred. A fresh user-issued pairing code in a new Codex chat is required. Do not replay the consumed code or bypass expiry. No production mutations performed to obtain another code.

## TEST RESULTS

| Component | Result |
|---|---|
| Backend tests | 104 files, 1059 passed |
| Backend typecheck / OpenNext build | passed / passed |
| Admin tests | 79 files, 534 passed |
| Admin typecheck / build | passed / passed |
| Admin lint | 0 errors, 29 existing warnings |
| Plugin full suite / build | 71 passed / passed |
| Installed MCP startup/tools/list | passed, 34 tools |
| Real LOCAL revoke smoke | passed |

Initial admin test typecheck used an unsupported Testing Library option; corrected and typecheck rerun successfully. Existing lint warnings include forms/hooks and unused code; they were not hidden. Generated plugin dist is excluded from admin ESLint; plugin source is still checked. Logs: /private/tmp/ai-stability-{backend,admin,plugin}*.log and ai-stability-local-revocation.log.

## TEST ARTIFACTS

Nothing automatically deleted.

- LOCAL revoked grant c0b8ae7c-e324-402c-af55-08f0b1660f95 (previous smoke).
- LOCAL revoked grant 51f520a5-f411-44fc-9512-46b52885579b (this read-only smoke); disabled fixture user 146c039f-a6d1-48ef-b18d-6160de9507b1.
- LOCAL retained draft 2bb4db56-5b60-441c-a149-960f8e28aae5, slug local-ai-access-c9709cb1-7bea-4602-9fd9-fbb86fdbb268.
- LOCAL test GLB metadata 7e4a4b90-5d49-42e3-bb05-df490673888d, local-plugin-test.glb; R2 key media/visualizer/e2017a64-ee49-42bc-aa1f-4fc0b5014cc8/model/5b44d6a1-ea1f-448a-ba44-3a03a0152156.glb.
- Calibration models 2053f2c6-2466-4153-b0c9-396a0694f2a2 (Earth v3) and df3074f4-93cd-4295-b9fb-1951b5cd594a (Earth HQ) may be real Base Earth dependencies. Do not classify as disposable without reference review.
- Retained LOCAL fixture directory: /var/folders/hz/81pbcdk57h3c6m9pgfzxwc480000gn/T/ai-delegated-e2e-e9SzKg.
- Plugin backup: /var/folders/hz/81pbcdk57h3c6m9pgfzxwc480000gn/T/svetikony-plugin-backup-15mm53un/svetikony.
- Temporary scripts: /private/tmp/ai-stability-backend.py, ai-stability-tests.py, ai-stability-installed.mjs; previous ai-pair-production.mjs and ai-worker-probe.mjs. Retained installed handshake state: /private/tmp/ai-stability-installed-90m1Ea. Test/build logs retained under /private/tmp/ai-stability-*.

Cleanup is a separate proposal: verify references first, retain necessary audit evidence, then request explicit authorization for exact rows/files/R2 objects. No production-wide artifact inventory or cleanup was performed.

## FILES CHANGED

Backend: lib/ai-access/{content,service,visualizer,terrain}.ts; app/api/ai-access/media/upload/route.ts; new lib/ai-access/enforcement.test.ts.

Admin: app/(dashboard)/ai-access/page.tsx; new page.test.tsx; lib/i18n/ai-access.ts; eslint.config.mjs.

Plugin: src/{transport,server}.mjs; dist/server.mjs; tests/{ai-access,production-readonly}.test.mjs; scripts/{ai-access-local-e2e.mjs,update-local.py}; .mcp.json; .codex-plugin/plugin.json; README.md; skills/site-operator/SKILL.md; this report and historical report notice. Local plugin source/cache updated with backup using official CLI reinstall.

## READY FOR DAILY USE

**No — final production acceptance remains pending.** Local implementation/checks are complete, but backend/admin corrections are not deployed, and a fresh Codex UI chat has not yet paired and repeated production reads. No authorization is inferred to deploy these fixes.

## NEXT STEP

Open a new Codex chat with the updated plugin, confirm 34 tools, issue a fresh code in web-admin and repeat only Calendar/Saints/Prayers reads. Separately authorize rollout of the reviewed local backend/admin fixes. After these gates, authorize one small production DRAFT_EDIT operation with readback and web-admin verification; publish remains disabled.
