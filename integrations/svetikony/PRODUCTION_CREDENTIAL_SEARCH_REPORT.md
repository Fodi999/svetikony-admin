# Production credential search — read-only

SERVICE CREDENTIAL SOURCE: a candidate was found (env), but no working production credential was found in the inspected sources.

Inspected current env/.dev.vars files in both repositories, env files under ~/.config, source/deployment/Cloudflare configuration references, and CI/keychain/password-manager references. Git history was not searched. No secret values are included. One unique candidate passed structural/expiry preflight but returned HTTP401 for GET /api/admin/church-content/calendar-days. This does not establish why production rejects it. No record count is available from that response.

Neither repository has .github/workflows. No project references to Keychain/1Password/Bitwarden credential retrieval were found. This is not a claim that the user's whole Keychain/password manager has no entry; unrelated credential stores were not searched. Cloudflare configuration/source references identify server environment use, not a locally recoverable working value. Remote secret stores were not modified or dumped.

PRODUCTION ENV: not configured; no rejected credential was copied. Dedicated file remains0600.
PRODUCTION AUTH:401 for the discovered candidate.
READ TESTS: calendar auth failed; saints/prayers not attempted after auth failure.
PLUGIN TOOLS:33/33 in a fresh MCP SDK process; a new Codex UI chat remains unverified.
WRITE ACCESS:DISABLED. Production write requests:0.

## Separate rotation plan — NOT executed

1. Owner identifies the original secure source and the current production BFF binding for SVET_IKONY_ADMIN_TOKEN. Confirm all consumers and a maintenance/rollback plan without exposing values.
2. If the existing value can be recovered from its authorized source, prefer direct secure transfer and GET verification; no rotation is then necessary.
3. If unrecoverable, review the existing trusted JWT issuance procedure, issuer, expiration and super_admin requirement. Prepare a replacement service credential only after explicit rotation approval. Do not obtain signing secrets through browser cookies or invent a session exchange.
4. Plan protected updates for each intended consumer, preserve access continuity, then test GET calendar/saints/prayers and normal admin access. Updating Cloudflare bindings is a production change and needs separate approval.
5. Existing requireSuperAdmin checks JWT signature/expiry/role; a replacement JWT alone does not revoke an old unexpired JWT. If revocation is required, decide separately how to handle existing verifier capabilities. Do not automatically rotate ADMIN_JWT_SECRET: that could invalidate other service credentials.
6. Keep MCP production writes disabled. Store any approved replacement only in protected storage and the0600 plugin env file. No token in reports, stdout, command arguments or Git.

No token was generated, no signing secret changed, no deploy/migration/publication occurred.
