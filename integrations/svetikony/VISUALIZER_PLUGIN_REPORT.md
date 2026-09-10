# LOCAL Visualizer plugin — 2026-09-10

## NEW PLUGIN TOOLS

11 additions; 29 tools total:

1. `list_visualizer_events`
2. `get_visualizer_event`
3. `create_visualizer_event`
4. `update_visualizer_event`
5. `list_visualizer_models`
6. `upload_visualizer_glb`
7. `attach_model_to_visualizer_event`
8. `get_base_earth`
9. `prepare_base_earth_change`
10. `set_base_earth`
11. `reconcile_visualizer_operation`

All new tools reject non-local origins. Original editorial tools retain their
previous behavior. This stage does not add a Visualizer publication tool.

## VISUALIZER SUPPORT / existing endpoints

| Actual backend endpoint | Existing capability | Plugin behavior |
|---|---|---|
| `/api/admin/church-content/visualizer-events` | GET/POST | Read and create draft |
| `…/visualizer-events/{id}` | GET/PUT/DELETE | Read/update unpublished draft; DELETE excluded |
| `/api/admin/church-content/visualizer-models` | GET/POST | List, register verified uploaded metadata |
| `…/visualizer-models/{id}` | GET/PUT/DELETE | Read and attach through eventGroupId; replacement/deletion excluded |
| `…/visualizer-models/{id}/set-base-earth` | POST | Reviewed explicit confirmation required |
| `/api/admin/media/upload` | POST multipart | Existing visualizer/model pipeline |
| `/media/{key}` | GET/HEAD | Verify MIME, size, ETag, SHA-256 on upload |
| `/api/church/visualizer-models/base-earth` | GET | Compare public/admin active model |
| `/api/church/visualizer-events[/{slug}]` | GET | Existing public data; list hides drafts |

Audited real backend route handlers, repositories, media validator/constants and
admin DTOs. No backend, D1 schema, upload architecture, rendering or public route
changes. Existing model r2Key replacement and DELETE can remove old R2 objects;
these operations are deliberately not exposed by the new tools.

Supported event fields match ChurchVisualizerEventPayload: title, slug, language,
summary, description, eventType, chronologyType, era, calendarEra, yearStart,
yearEnd, century, displayDate, sortYear, locationName, latitude, longitude,
calendarDayId, status, isFeatured. Status is narrowed to `draft`. Unknown fields,
invalid enums/numbers, unsupported coordinates/periods and identity changes are
rejected. Optional calendar relationship is checked for ID and language.

get_visualizer_event returns the event, actual language siblings and group models.
Draft preview belongs in the authenticated admin interface; no new public draft
preview route is invented. This task verified public JSON visibility, not a new
visual rendering implementation or a browser UI save.

## GLB SUPPORT / R2 SUPPORT

Extension .glb, MIME model/gltf-binary (generic octet-stream normalized only after
binary validation), regular file, configured real-path roots, <=50 MiB, GLB v2,
JSON/chunk boundaries and embedded resources are checked before upload. GLB
validation mirrors the existing backend contract; it is not a complete glTF
conformance or visual-quality certification.

Flow: upload → verify LOCAL file bytes/headers → register metadata → read back
metadata and verify bytes. R2 key is assigned by the existing backend:
`media/visualizer/{requestId}/model/{uuid}.glb`. A returned SITE_URL pointing to
production is never fetched; the selected LOCAL origin is used for media checks.
No bearer credentials go to the public media route. Binary bytes never enter D1.

Uploads return model ID, R2 key, LOCAL URL, filename, size, MIME, ETag and SHA-256.
They create standalone metadata. attach_model_to_visualizer_event links one model
to the real event translation group; all its language rows must be drafts.
No model is moved out of another group and active Base Earth cannot be attached.

Writes use the existing local SQLite operation journal, origin isolation and
shared lock. Stable requestId prevents replays; unknown outcomes are reconciled
by reads only. R2 and D1 operations are not an atomic transaction: an interruption
can leave an object without registered metadata. Its receipt/known key is kept;
no automatic reupload/delete or false success. Backend lacks atomic conditional
updates, so external concurrent CMS edits remain a limitation.

## TRANSLATIONS

The backend auto-joins identical slugs through translation_group_id. The plugin
requires an explicit translationOf sibling for an existing slug, creates only
missing uk/ru/en rows, and verifies the returned group and language uniqueness.
Model eventGroupId refers to the shared group, not one language-row ID.

Real LOCAL MCP integration smoke created:

- slug: `local-plugin-smoke-62a14773-1b36-4768-83b6-1007900382fa`
- UK: `a3330c39-d105-4ffa-ae2f-1cd69f064f43`
- RU: `6b7beac6-0ec8-4083-a96f-4b3bafdae235`
- EN: `47854196-df8a-4a91-af3c-1b9de5a44611`
- common group: `b13e9fe2-da55-4f1a-a73f-772d7c411dd9`
- all three remain draft; one UK summary update also verified.
- model: `7e4a4b90-5d49-42e3-bb05-df490673888d`, attached to that group.
- file: `local-plugin-test.glb`, 468 bytes, model/gltf-binary.
- key: `media/visualizer/e2017a64-ee49-42bc-aa1f-4fc0b5014cc8/model/5b44d6a1-ea1f-448a-ba44-3a03a0152156.glb`
- SHA-256: `740eac73c1645b0f13277e34d149c82a8a88588710c972e7c3ebaba957c00c03`

These are explicitly labelled technical fixtures, not historical events. They
remain LOCAL because deletion was not authorized. Public event list does not
include the drafts. Receipts/state are under
`/private/tmp/svetikony-visualizer-smoke-20260910`.

## BASE EARTH SAFETY

prepare_base_earth_change only stores a LOCAL preview. It shows current/new model,
file size, R2 key and affected public visualizer. set_base_earth requires the exact
proposal confirmation AFTER explicit user approval. Proposals expire in 15 minutes;
current/candidate metadata and media are checked again immediately before applying.
After an approved switch, public/admin Base Earth and the retained old file are
verified. Missing/wrong/stale/expired confirmation is refused.

Actual LOCAL Base Earth remains `df3074f4-93cd-4295-b9fb-1951b5cd594a`,
`earth_web_hq.glb`, 13,190,404 bytes. No real Base Earth replacement was performed;
the mutation path and interrupted-response recovery were tested against mocked HTTP.
A preview-only smoke proposal was created and never applied.

## TERRAIN GAP — audit only

Inspected the existing bundle at
`/Users/dmitrijfomin/Desktop/CodexWorkspace/Eastern_Europe_Terrain_L1`:
9 unique L1 tiles, 38,635,496 bytes total, bounds 20–44°E / 41–53°N.
All 9 actual file sizes and SHA-256 hashes match terrain_manifest.json.
The manifest contains shared regional coordinates (AEQD + spherical sag),
metersPerUnit=100000, origin 48.5°N/31°E, baked identity transforms, LOD/grid data,
anchors, credits and future child IDs. Future L2 child references are not an
assertion that L2 binaries exist; validate the declared L1 scope separately.

Gaps:

- No terrain module/purpose or JSON manifest upload in the media allowlist.
- No versioned bundle metadata, staged/completed state, manifest-to-R2 key mapping,
  per-tile recovery/idempotency or activation endpoint.
- No terrain loader/LOD manager in the public site; existing GLB model handling is
  not a terrain streaming system. Shared regional coordinate transforms, LOD
  transitions, seams, GPU cache and attribution need a separate implementation.
- The current general upload path generates UUID keys and cannot atomically upload
  manifest + nine files. Reusing eventGroupId for a system bundle would be wrong.

Proposed FUTURE contracts (NOT implemented):

`validate_terrain_bundle({manifestPath, rootDirectory})` →
`{validationId, manifestSha256, bundleFingerprint, region, bounds, coordinateSystem,
 lods, tileCount, totalBytes, tiles:[{tileId,file,size,sha256,lod,bounds}],
 missingFiles, duplicateTileIds, errors, warnings, uploadPlan, ready}`.
Read-only, rejects path escapes/unsupported schema/invalid bounds or LOD, checks
file names/MIME/chunks/hashes/size, requested grid coverage, transforms and credits.
The validation receipt fixes the exact bytes, scope and destination plan.

`upload_terrain_bundle({validationId, requestId})` →
`{bundleId,version,state,manifestKey,manifestUrl,tiles:[{tileId,r2Key,url,verified}],
 completedCount,remainingTiles,errors}`.
LOCAL-first, revalidates fingerprints; stages immutable tile objects, verifies
all, then writes the resolved manifest and marks the bundle complete. Never
activates an incomplete package or replaces an active one. Resume is per-tile
verified/idempotent; activation and destructive cleanup are separate approved
operations. Requires the dedicated backend contract before this tool is added.

## TESTS

- Plugin: 49 passing tests, including actual MCP handshake/tool calls.
- Admin: 527 tests in 77 files passed.
- Admin typecheck passed.
- Plugin standalone esbuild bundle passed.
- Admin production build passed (Next 16.2.12 webpack).
- Plugin manifest and skill validators passed.
- Real LOCAL smoke: 3 creates, 1 update, 1 GLB upload, 1 metadata registration,
  1 attachment; all read back, shared translation group and public draft absence
  checked. No production calls, publication, R2 deletion or Base Earth switching.
- Existing Next middleware→proxy deprecation warning remains. Node 24 reports
  its built-in SQLite experimental warning. Neither blocked checks.
- Existing user change to vitest.config.ts was preserved. No commit/push/deploy.

## EXAMPLE CHAT COMMANDS

- «LOCAL: покажи события visualizer и текущую Base Earth».
- «Создай черновик Крещения Руси: 988 год, Киев. Проверь факты, добавь отсутствующие
  UK/RU/EN в одну группу. Не публикуй».
- «Загрузи /путь/kyiv_988.glb и привяжи к группе этого события. Не публикуй».
- «Покажи, что изменится при назначении этой модели Base Earth. Пока не применяй».
- «Проверь результат прерванной операции по operationId, ничего не повторяй».

The example historical event and kyiv_988.glb were not created/uploaded in this
task; only the clearly labelled technical fixture was used.
