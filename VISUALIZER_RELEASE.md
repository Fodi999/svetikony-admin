# Визуализатор православной истории — готовность MVP

Дата: 10 сентября 2026. Проекты: `svet-ikony` (сайт/API/D1/R2),
`svetikony-admin` (админка/BFF). Реализуется MVP исходного плана;
исторические материалы и GLB администратор готовит вручную.

## Как пользоваться

1. Запустить сайт: `cd ../svet-ikony && npm run dev` — http://localhost:3000.
2. Запустить админку: `npm run dev` — http://localhost:3001.
3. Войти своей существующей учётной записью и открыть «Візуалізатор».
   В проверенной локальной базе пользователей пока нет: для входа нужна
   первоначальная учётная запись. Она не создавалась без выбранного владельцем email.
4. В блоке «Основна модель Землі» загрузить собственную Землю. Без неё
   работает встроенный глобус. Вкладка «3D-моделі» позволяет просмотреть
   библиотеку и выбрать другую самостоятельную модель основной Землёй.
5. Создать событие: название, slug, описания, язык, тип, эпоха, хронология,
   дата/период, место. Неизвестные годы и координаты можно не заполнять.
   Для традиционной датировки использовать текст даты и тип «Традиційне
   датування». «Порядок у хронології» задаёт машинную сортировку, не
   отображаемую посетителям; пустое поле включает автоматическое вычисление.
6. При необходимости выбрать существующее событие церковного календаря.
7. Сохранить событие, затем загрузить его GLB на вкладке «3D-модель».
   После загрузки доступны вращение, zoom, выбор анимации, play/pause,
   reset camera. Модель можно заменить, сохранив связь с событием.
8. Опубликовать событие. На сайте открыть `/uk/pravoslavna-istoriya`
   (также `/ru/…` и `/en/…`), выбрать эпоху, век, год и событие.
   Неизвестные уровни даты пропускаются, а BC/AD не смешиваются.
9. При выборе события с координатами Земля поворачивается, камера
   приближается, модель показывается у выбранной точки. Без координат
   GLB показывается отдельно. Информационная панель доступна независимо
   от наличия модели и WebGL.

## Подготовка Blender / GLB

- Экспорт glTF 2.0 → GLB, встроенные текстуры и ресурсы, до **50 MiB**.
- Для MVP используйте обычный экспорт без Draco/KTX2-компрессии: отдельные
  декодеры с внешних CDN не подключаются. Ошибка модели не блокирует текст.
- Основная Земля: север +Y, Гринвич +Z, восточные долготы в сторону +X.
  В полной сцене объект `Earth` задаёт центр и масштаб, а камера GLB —
  начальный вид; звёздная сфера не участвует в расчёте масштаба. Экспортированные
  географические anchors задают ориентацию долгот. Без anchors согласование осей
  важно, чтобы координаты совпадали с нарисованными материками.
- Модель события: вертикаль +Y. Размер и центр автоматически подгоняются.
- Встроенные анимации доступны в preview; публичная сцена воспроизводит
  первый clip, кроме режима уменьшенного движения.
- Заменяемые файлы получают новый UUID-ключ. Не перезаписывайте бинарник
  под старым ключом: ответы кешируются как immutable.

## База и storage

Схема — существующая миграция `svet-ikony/migrations/0019_visualizer.sql`:
`visualizer_events` и `visualizer_models`. Новых миграций для доведения
MVP не потребовалось. После первого production-запуска обнаружено, что
`0019_visualizer.sql` оставалась неприменённой: оба API возвращали
`DATABASE_ERROR`, таблицы визуализатора отсутствовали. 10 сентября 2026
миграция применена к `svetikony-production` через Wrangler. Проверены
HTTP 200 для публичного списка событий, основной модели и страницы
`/uk/pravoslavna-istoriya`. Закрытый BFF без пользовательской сессии
не проверялся; требуется обновить страницу в авторизованной админке.

GLB хранится только в существующем R2 binding `MEDIA_BUCKET`, по ключу
`media/visualizer/{entityId}/model/{uuid}.glb`. В D1 сохраняются key,
имя, MIME, размер и связь с группой переводов. Сервер сверяет metadata
с R2, поэтому клиент не может подменить размер/тип через JSON.

Удаление последнего перевода очищает модели события; активная основная
Земля сохраняется и отвязывается от удалённой группы. Перед физическим
удалением файла проверяются ссылки в текстовых полях существующих D1
таблиц, включая URL и JSON-коллекции. Ошибка проверки сохраняет файл.
После замены новая metadata сохраняется до очистки старого файла.

## Безопасность

- Использованы существующие admin auth, роли, BFF и storage helpers.
- Новый `/api/bff/visualizer-models/[id]/file` требует права просмотра
  контента и отдаёт GLB через origin админки; service token остаётся на
  сервере. Arbitrary URL/path не принимаются. Ответы `no-store`.
- CSP не открывается для произвольных внешних fetch. Для встроенных
  текстур GLB разрешены `blob:` в `img-src` и `connect-src` (ImageBitmapLoader
  получает встроенные изображения через fetch).
- Upload проверяет расширение, MIME, размер, GLB v2 header/длину/chunks,
  JSON и отсутствие внешних buffer/image URL. Пустой/общий MIME для
  настоящего `.glb` нормализуется в `model/gltf-binary`.
- Публичный список получает только опубликованные события. Черновики
  доступны администратору, а не через публичный список.
- Страница истории читает опубликованные события непосредственно из D1,
  без HTTP-запроса к собственному серверу и зависимости от его порта.
- Локальные URL в игнорируемых `.env.local`/`.dev.vars` согласованы с
  портами 3000/3001; production secrets и deployment не изменялись.

## Производительность и UX

Three.js загружается динамически. GLB события — только при выборе;
preview библиотеки — по кнопке. DPR ограничен 2. Размер canvas отслеживает
ResizeObserver. Скрытая вкладка останавливает цикл рендера; старые
geometry/materials/textures и анимации освобождаются. Устаревшие ответы
не подменяют текущую выбранную модель. Есть loading/error состояния,
повторная попытка в админке, fallback при отсутствии WebGL и резервная
Земля при отсутствии/ошибке base GLB. Названия и сообщения публичного
визуализатора есть на UK/RU/EN.

## Проверки

- Сайт: **920 тестов**, TypeScript passed; ESLint — **0 errors**.
- Админка: **527 тестов**, TypeScript passed; ESLint — **0 errors**.
- В обоих репозиториях остаются по 25 предупреждений lint; правила и
  TypeScript не отключались. После замены неработавшего `next lint`
  исправлены выявленные ошибки старых компонентов состояния/refs.
- Production-сборки сайта (OpenNext Worker) и админки выполнены успешно.
- Реальный локальный D1/R2 smoke-тест выполнен с официальным
  [Khronos BoxAnimated](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/BoxAnimated):
  upload, валидация, канонический MIME, сохранение metadata, выдача и
  разбор GLB/анимаций настоящим GLTFLoader, draft/publish, появление
  опубликованного события в HTML страницы, общие модели
  переводов, замена, защита основной Земли и очистка файлов.
- Команда повторения: из сайта
  `node scripts/visualizer/smoke.mjs /path/to/BoxAnimated.glb`.
  Только localhost:3000, локальная база без пользовательской основной
  Земли; создаёт временные тестовые записи и удаляет их в finally.
- Дополнительные регрессии проверяют: модель без координат, приближение
  камеры, сортировку BC/AD, неизвестную дату, ошибки GPU/GLB, auth и
  namespace BFF media, кнопки animation/reset/error preview.
- Управление Chrome в этой среде не разрешено, поэтому визуальная
  проверка в настоящем браузере/на мобильном устройстве не выполнена.
  Тесты сцены используют настоящую геометрию Three.js с заменой GPU,
  тесты preview — DOM-среду. Это ограничение проверки, не утверждение
  о прохождении браузерного end-to-end сценария.

## Что отложено по исходному плану

AI/Blender automation, видеоредактор, physics/weather/multiplayer,
автоматическое историческое наполнение, audio narration/subtitles,
camera keyframes, сложный timeline, исторические границы и симуляции.
Календарная relation готова; публичная кнопка на календаре оставлена
на следующую фазу, как допускает план. Production deployment не выполнялся.

## Изменённые файлы

Список ниже включает доведение MVP и предшествующее исправление локального
запуска/глобуса в этой сессии. `.env.local`/`.dev.vars` не включаются в git.

### svet-ikony

- `app/api/admin/church-content/visualizer-events/[id]/route.ts`
- `app/api/admin/church-content/visualizer-models/[id]/route.ts`
- `app/api/admin/church-content/visualizer-models/route.ts`
- `app/api/admin/media/route.ts`
- `app/api/admin/media/upload/route.ts`
- `app/api/church/visualizer-events/route.test.ts`
- `app/api/church/visualizer-events/route.ts`
- `app/media/[...key]/route.ts`
- `app/pravoslavna-istoriya/page.tsx`
- `components/site/CalendarView.tsx`
- `components/site/IconPhotoCatalog.tsx`
- `components/site/PWAInstallPrompt.tsx`
- `components/site/prayer-mode/PrayerAudioBar.tsx`
- `components/site/prayer-mode/PrayerVisualizerCanvas.tsx`
- `components/site/visualizer/Earth3DCanvas.test.ts`
- `components/site/visualizer/Earth3DCanvas.tsx`
- `components/site/visualizer/HistoryVisualizer.tsx`
- `eslint.config.mjs`
- `lib/d1/repositories/visualizerEvents.ts`
- `lib/media/glb.test.ts`
- `lib/media/glb.ts`
- `lib/media/model-metadata.ts`
- `lib/media/references.ts`
- `lib/visualizer/README.md`
- `lib/visualizer/chronology.test.ts`
- `lib/visualizer/chronology.ts`
- `lib/visualizer/default-earth.ts`
- `lib/visualizer/land-outlines.json`
- `lib/visualizer/validate-event.ts`
- `messages/en.json`
- `messages/ru.json`
- `messages/uk.json`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `scripts/visualizer/smoke.mjs`

### svetikony-admin

- `VISUALIZER_AUDIT.md`
- `VISUALIZER_RELEASE.md`
- `app/api/bff/_lib/proxy.ts`
- `app/api/bff/visualizer-events/_contract.test.ts`
- `app/api/bff/visualizer-events/_contract.ts`
- `app/api/bff/visualizer-events/route.test.ts`
- `app/api/bff/visualizer-models/[id]/file/route.test.ts`
- `app/api/bff/visualizer-models/[id]/file/route.ts`
- `components/forms/media-upload-button.tsx`
- `components/forms/model-viewer-preview.test.tsx`
- `components/forms/model-viewer-preview.tsx`
- `features/visualizer/visualizer-event-form.tsx`
- `features/visualizer/visualizer-event-list-view.tsx`
- `features/visualizer/visualizer-models-panel.tsx`
- `lib/api/client.ts`
- `lib/api/http/media.ts`
- `lib/api/http/visualizer-events.ts`
- `lib/api/http/visualizer-models.ts`
- `lib/api/mock/visualizer-models.ts`
- `lib/media/visualizer-preview-url.ts`
- `lib/validation/visualizer-event.schema.ts`
- `next.config.ts`
- `package.json`
- `types/entities.ts`
