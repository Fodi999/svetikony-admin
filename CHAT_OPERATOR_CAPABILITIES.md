# Управление «Світ Ікони» через чат

Проверено 2026-09-10. Правила пользователя из задания этой даты действуют для
последующих операций: LOCAL, по умолчанию DRAFT; сначала анализ, затем ограниченные
изменения и проверка чтением. PUBLISH — только после отдельного явного разрешения.
Карта обновлена после LOCAL Visualizer-расширения: реализация и проверки описаны в integrations/svetikony/VISUALIZER_PLUGIN_REPORT.md.

## Подключение

- MCP: 29 инструментов, `connection_status` → connected=true, LOCAL,
  http://localhost:3000, serviceIdentity=true.
- Backend `/`: HTTP 307; редакционный API отвечает через плагин.
- Админка http://localhost:3001: HTTP 401 без авторизованной сессии.
  Сервис отвечает; доступ к интерфейсу в этой проверке не подтверждён.
- Production в этой проверке не запрашивался и не менялся. Последняя проверка
  подключения вернула 401; действующего production-доступа не подтверждено.
- Инвентаризация полная: calendar 30, saints 27, icons 0, prayers 60,
  articles 16, gospel 5, alphabet 138. Все 276 существующих редакционных записей published. Отдельно LOCAL Visualizer smoke добавил 3 технических draft-события UK/RU/EN и один GLB 468 байт; активная HQ-Земля сохранена.

## Карта возможностей

| Область | Плагин сейчас | Другой путь / ограничение |
|---|---|---|
| READ | connection_status, site_inventory, list_content, get_content | 7 редакционных разделов |
| CREATE / UPDATE | prepare_change → get_change → apply_draft | Предложение локальное; CMS записывается только при apply; published запрещены в DRAFT |
| DELETE | Нет | Маршруты удаления есть в BFF; нужны авторизация и подтверждение; не проверялись записью |
| UPLOAD / MEDIA | upload_image: PNG/JPEG/WebP, привязка отдельным предложением | Генерация через отдельный инструмент изображений; GLB: отдельный upload_visualizer_glb, до 50 MiB |
| PREVIEW | get_change — diff данных | Визуальный preview через браузер; это не то же самое, что diff |
| PUBLISH | publish_change | Только явно разрешённое проверенное предложение |
| UNPUBLISH | Нет отдельного инструмента | Проверять контракт статуса конкретного раздела перед выполнением через API/UI |
| R2 | Загрузка редакционного изображения | Общий список/удаление media есть в BFF; удаления плагин не выполняет |
| D1 | Чтение/запись редакционного контента через API | Нет произвольного SQL и migrations |
| VISUALIZER | LOCAL: events read/create/update draft, models list/upload/attach, Base Earth read/prepare/set, reconcile | Реальный LOCAL smoke пройден; замена Base Earth требует предварительного просмотра и явного подтверждения; delete/publish отсутствуют |
| CALENDAR | Покрытие года/месяца, поля, даты, предложения | Факты и праздники требуют источников; применение связанных черновиков ограничено при активном Telegram autopost |
| SAINTS / PRAYERS / ARTICLES | Чтение, предложения, черновики, связи по разрешённым полям | Поля проверять entity_schema перед записью |
| SEO | Поля, дубли slug/metadata, связи записей | canonical, hreflang, robots и реальные ссылки проверять в HTML отдельно |
| TRANSLATIONS | Чтение language/translationGroupId, создание версии с language | Нет записи translationGroupId напрямую; календарный API использует общий slug для auto-join. Проверять правило для каждой сущности и group ID после создания |
| TERRAIN / LOD | Нет | Будущая отдельная логика manifest/tiles/bounds/LOD; не заявлять готовой |

Оставшиеся инструменты: entity_schema, audit_content, calendar_coverage,
content_relations, day_image_context, list_changes, reconcile_change,
prepare_restore, operation_log. Исходных редакционных инструментов — 18; расширение Visualizer добавляет 11 (всего 29).

Уточнение по переводам: отсутствие отдельного translate-tool не означает, что
API не умеет связывать языки. Сначала проверяются существующие версии и контракт
auto-join; создание независимых сущностей вместо переводов недопустимо.

## Порядок выполнения команд

1. Проверить среду и выбрать структурированный инструмент. Не переключать origin
   и не обходить 401. Браузер нужен для preview/UI или недостающей операции.
2. Определить сущности, IDs, язык, статус и связи. Для массовых правок показать
   объём, примеры и diff. Не считать заполненность доказательством достоверности.
3. Подготовить предложение; при разрешённой записи применить только черновик.
   Проверить сохранённые поля, связи, translation group и статус чтением API.
4. Не повторять неопределённую запись: сначала reconcile_change.
5. Перед publish/deploy/production migration/permanent delete/R2 delete,
   массовой правкой published, сменой auth/security, заменой Base Earth и массовой
   правкой production-календаря показать WHAT WILL CHANGE, AFFECTED RECORDS,
   FILES, DATABASE, R2, RISKS и дождаться подтверждения пользователя.
6. До upload проверить MIME, extension, размер, назначение и правило ключа;
   после — наличие объекта и Content-Type, вернуть key/URL. Серверный случайный
   ключ не выдавать за заранее известный. Предыдущий объект не удалять.
7. Код менять минимально; после кода — typecheck/tests/build. Документация сама
   по себе не требует пересборки приложений. Не считать git push публикацией CMS.

Финальный отчёт: RESULT, CHANGED, NOT CHANGED, DRAFT / PUBLISHED, DATABASE,
R2, TRANSLATIONS, CHECKS, NEEDS APPROVAL, NEXT STEP. Во время работы — краткие
обновления на русском. Нельзя утверждать успех без фактического результата инструмента.

Следующий рекомендуемый шаг: READ_ONLY-аудит календаря октября 2026 с пропусками,
связями и языками, затем конкретные предложения исправлений без публикации.


## LOCAL Terrain bundle extension

Plugin now exposes 33 tools, including validate/upload/reconcile/resume terrain bundle. Actual 9-tile L1 validation passed; real upload awaits explicit confirmation. Details: [TERRAIN_BUNDLE_REPORT](integrations/svetikony/TERRAIN_BUNDLE_REPORT.md). No Base Earth or production changes.
