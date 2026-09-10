# Світ Ікони · Codex

Личный плагин для управления редакционным содержимым через Codex. Поддерживает календарь, святых, иконы, молитвы, статьи, Евангелие и азбуку. Также поддерживает LOCAL Visualizer: черновики событий, переводы, GLB и подтверждаемую замену Base Earth. Код публичного сайта, дизайн, инфраструктура, заказы и цены не входят в инструменты.

## Подключение на этом Mac

Плагин использует Node 24+ и два существующих серверных параметра из `/Users/dmitrijfomin/Desktop/svetikony-admin/.env.local`: `SVET_IKONY_API_BASE_URL` и `SVET_IKONY_ADMIN_TOKEN`. Файл не копируется в плагин. В MCP-конфигурации находится только путь, секрет не передаётся модели. Доступ осуществляется к `/api/admin/church-content/...`, тем же административным операциям backend, которыми пользуется BFF админки. BFF и человеческая cookie-сессия при этом не используются; административный сервисный ключ имеет широкие права, область плагина ограничивается его серверным кодом.

На момент настройки проверено подключение к **локальному** `http://localhost:3000`. Этот же ключ получил HTTP 401 на `https://svetikony.com`. Production не подключён. Для локальной работы должен быть запущен `npm run dev` в `svet-ikony`. Сервер MCP не запускает, не останавливает и не развёртывает сайт.

Установленная копия: `~/plugins/svetikony`. Личный marketplace: `~/.agents/plugins/marketplace.json`. Плагин появляется в новом чате Codex после установки; уже открытый чат не получает новые инструменты автоматически.

В Codex выберите **GPT-6 Astra**, если модель доступна вашему аккаунту, и включите плагин «Світ Ікони · Codex». Модель выбирается в клиенте, плагин её не переключает. В плагине нет отдельного вызова платной OpenAI API для анализа. Ограничения и оплата использования Codex и генерации изображений определяются вашим доступом к соответствующим инструментам.

Примеры команд:

- «Проверь подключение Svetikony и скажи, локальная это среда или production».
- «Проанализируй календарь на 2026 год. Покажи пробелы и предложи очередность заполнения».
- «Проверь связи святых, молитв и икон. Подготовь исправления без публикации».
- «Подготовь SEO для выбранных страниц, сообщай о ходе работы и покажи изменения».
- «Подготовь иллюстрацию для 10 сентября по подтверждённому содержимому дня и сохрани предложение привязки».
- «Покажи журнал последних изменений».

## Состояния и границы

`prepare_change` сохраняет **локальное предложение**, ещё не видимое в CMS. `apply_draft` записывает новый/существующий черновик и перечитывает его. `publish_change` — отдельное публичное действие с подтверждением конкретного ID. Изменения опубликованной записи нельзя применить как черновик.

Перед записью календарного или связанного с календарём черновика плагин проверяет, выключен ли автономный Telegram-autopost: существующий cron может использовать черновики. При включённом автопостинге предложение остаётся локальным. Плагин не меняет настройки Telegram и не отправляет сообщений.

Предложения и версии разделены по API-origin и хранятся в `~/.local/state/svetikony/operator.sqlite`, с закрытыми файловыми правами. Это отдельный локальный журнал оператора, не история ревизий в интерфейсе админки. Просмотр — `list_changes`, `get_change`, `operation_log`. Для проверенного изменения можно подготовить обратную редакцию через `prepare_restore`; новые сущности не удаляются автоматически.

Все операции плагина сериализуются локальной блокировкой. До записи проверяется снимок источника, после неё — сохранённые поля. В старом backend нет атомарного условия версии: параллельное изменение из обычной админки всё ещё может создать гонку между проверкой и записью. При применении пакета избегайте одновременного редактирования тех же записей через CMS. Неизвестный исход записи блокирует продолжение: `reconcile_change` только перечитывает, не повторяет запись. Если невозможно подтвердить результат, нужна ручная сверка, автоматического снятия блокировки нет.

Плагин проверяет хранимые поля и связи, но не удостоверяет достоверность богословских/исторических утверждений, полноту чтений и качество реальных HTML-ссылок. Для визуальной проверки Codex использует отдельно доступный браузер. Плагин не меняет single-FK схему на many-to-many и не считает 365 непустых карточек проверенным церковным календарём.

Для иллюстраций `day_image_context` отдаёт факты конкретного дня. Генерация выполняется доступным инструментом изображений Codex; MCP сам не генерирует картинку. `upload_image` принимает PNG/JPEG/WebP до 10 MiB из разрешённых папок, загружает медиа и создаёт предложение привязки. URL загруженного файла может быть доступен напрямую, но картинка не появляется на странице до применения изменения. AI-иллюстрация отмечается как непроверенная; заявления о каноничности не добавляются.

Это работа по команде пользователя, не круглосуточный планировщик: закрытие Codex прекращает выполнение модельной части. Прогресс и предложения сохраняются, задачи можно продолжить в следующем чате.

## Разработка

```sh
npm ci
npm test
npm run build
```

Исходники находятся в `src/`, автономная сборка — `dist/server.mjs`. Для исполнения сборки не нужен `node_modules`. Локальная `.mcp.json` содержит абсолютные пути этого Mac; при переносе они настраиваются заново.

Проверка настоящего MCP без изменений данных:

```sh
SVETIKONY_ENV_FILE=/Users/dmitrijfomin/Desktop/svetikony-admin/.env.local node scripts/smoke.mjs
```

Установку выполняет личный marketplace Codex. Для обновления следуйте skill `plugin-creator`: проверка имён, cachebuster и `codex plugin add svetikony@personal`. Не меняйте конфигурацию других плагинов или выбранную модель пользователя.

## LOCAL Visualizer extension (2026-09-10)

Now **29 tools**: the original 18 editorial tools plus:

- `list_visualizer_events`, `get_visualizer_event`
- `create_visualizer_event`, `update_visualizer_event` (unpublished drafts only)
- `list_visualizer_models`, `upload_visualizer_glb`, `attach_model_to_visualizer_event`
- `get_base_earth`, `prepare_base_earth_change`, `set_base_earth`
- `reconcile_visualizer_operation`

This explicitly extends the original editorial-only scope **for LOCAL only**.
Visualizer tools reject production even if the configuration's environment label
is spoofed. Existing editorial publication behavior is unchanged; it does not
support Visualizer entities. No direct SQL, delete, deploy or terrain upload.

Create/update/attach/upload require a stable caller-generated UUID `requestId`.
They write immediately, then read back and return `{operationId, verified, result}`.
Retain requestId on retries. Interrupted writes retain the shared operation lock;
use `get_change` and `reconcile_visualizer_operation` instead of retrying. Unknown
upload responses may require manual inspection; objects are never automatically
reuploaded or deleted. Locks cover plugin operations only, not external CMS edits.

Create takes an `event` object using the actual Worker fields and optional
`translationOf` sibling ID. Existing translations share the SAME slug; after
creation group IDs are verified. Duplicate languages and accidental slug reuse
without an explicit sibling are rejected. Update takes `id` and `patch`; status
is draft-only and slug/language identity changes are refused. Optional
`calendarDayId` must reference a record of the same language.

GLB upload takes `path`, optional `title` and `mimeType`. Checks extension, regular
file, allowed roots, <=50 MiB, GLB v2 and embedded resources. Upload uses existing
`module=visualizer`, `purpose=model` multipart pipeline, then verifies LOCAL bytes
and registers standalone metadata. Returns `r2Key`, `url`, `filename`, `size`,
`mimeType`, `sha256`, and model ID. The returned URL always uses the selected local
backend, even if that backend's SITE_URL points elsewhere. One attachment to an
actual translation group serves uk/ru/en; all existing siblings must be drafts.

Base Earth is two-step: `prepare_base_earth_change({modelId})` returns the complete
preview and a 15-minute proposal. Present it and wait for the user's explicit
approval before `set_base_earth({proposalId, confirmation})`. The confirmation is
`SET BASE EARTH <proposalId>`; a tool-returned string is never user consent.
State and media are rechecked before switching; old model/files are retained.

Real LOCAL write smoke (creates retained test drafts and a 468-byte triangle;
no publishing, Base Earth switching or deletion):

```sh
SVETIKONY_ENV_FILE=/path/to/admin/.env.local \
SVETIKONY_SMOKE_DIR=/private/tmp/new-unique-smoke-directory \
node scripts/visualizer-smoke.mjs --write-local-smoke
```

Do not repeat an interrupted smoke with a new directory to bypass uncertainty.
Its started/results files and SQLite state keep IDs and receipts for inspection.
Use a new Codex thread after plugin reinstall to load the 29-tool version.

## LOCAL terrain bundles

**33 tools** after this extension: the previous 29 plus
`validate_terrain_bundle`, `upload_terrain_bundle`, `reconcile_terrain_bundle`,
`resume_terrain_bundle`. Actual R2 upload requires the user's explicit confirmation
AFTER the validation plan is shown. Validation only reads local files and stores
a local receipt. No new SQL access, Base Earth change, deployment or publishing.

The existing R2 binding is accessed by new LOCAL-only backend routes under
`/api/admin/terrain-bundles/{region}/L{lod}`. A production build refuses them even
when called with a localhost Host. There are no R2 credentials in the plugin.
Metadata is the `_bundle.json` R2 sidecar; no D1 migration is required.

Exact object paths are `terrain/{region}/L{lod}/manifest.json` and
`terrain/{region}/L{lod}/{x}_{y}.glb`. The remote manifest uses those filenames.
Different content at the same prefix is a conflict: no overwrite/delete. Complete
metadata is written only after all files reconcile, and LOCAL `/terrain/...`
delivery refuses staging bundles. Do not confuse storage completion with a terrain
renderer or LOD manager on the public page; those are outside this task.

The full upload plan, current L1 validation and recovery behavior are documented in
[TERRAIN_BUNDLE_REPORT.md](TERRAIN_BUNDLE_REPORT.md). L2/L3 use the same contract;
real data validation for this release uses the existing nine L1 files.
