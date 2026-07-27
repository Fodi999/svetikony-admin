# Світ Ікони — Адмінка (svetikony-admin)

Mobile-first PWA-адмінка для керування контентом сайту **svetikony.com**.

**Стан проєкту: Етап 1 (Stage 1) — завершено.**
Увесь інтерфейс, навігація, форми та дані працюють на mock-адаптері.
Жодного запиту до production API, D1, Koyeb чи сайту svetikony.com не виконується.

## Технологічний стек

- Next.js 16 (App Router) + TypeScript (strict) + React 19
- Tailwind CSS 4 + shadcn/ui (стиль `base-nova`, на базі `@base-ui/react`, не Radix)
- Lucide Icons
- React Hook Form + Zod
- TanStack Query
- next-themes (світла/темна тема)
- Serwist (`@serwist/next`) — service worker / PWA
- Власний типізований шар перекладів інтерфейсу (`lib/i18n`) — окремо від мовних полів контенту (uk/ru/en)
- Vitest + Testing Library (unit-тести)
- Playwright (e2e-тести, Chromium + Mobile Safari)
- ESLint + Prettier

## Швидкий старт

```bash
npm install
npm run dev
```

Відкрити [http://localhost:3000](http://localhost:3000). Буде показано екран входу.

### Тестові облікові записи (Stage 1, mock)

| Роль | Email | Пароль |
|---|---|---|
| super_admin | admin@svetikony.com | admin123 |
| editor | editor@svetikony.com | editor123 |
| order_manager | orders@svetikony.com | orders123 |
| viewer | viewer@svetikony.com | viewer123 |

На екрані входу є кнопки швидкого заповнення для кожного акаунта.

### Команди

```bash
npm run dev          # dev-сервер (Turbopack вимкнено — див. "Нотатки" нижче)
npm run build         # production build
npm run start         # запуск production build локально
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run format        # Prettier (запис)
npm run format:check  # Prettier (перевірка)
npm run test          # Vitest, один прогін
npm run test:watch    # Vitest, watch-режим
npm run test:e2e      # Playwright e2e (build + start + тести)
```

### Важливо: dev/build запускаються з `--webpack`

Next.js 16 за замовчуванням використовує Turbopack, але `@serwist/next` (PWA/service worker)
поки що не підтримує Turbopack. Тому `npm run dev` і `npm run build` явно передають `--webpack`.
Це також узгоджується з вимогою сумісності деплою через OpenNext на Cloudflare Workers, де
збірка на основі webpack є більш перевіреним шляхом.

У dev-режимі service worker вимкнено (`disable: NODE_ENV === "development"`); PWA можна
перевірити лише на production build (`npm run build && npm run start`).

## Скидання mock-даних

Мок-дані зберігаються в `sessionStorage` браузера (окремо для кожної вкладки), щоб створені
й відредаговані записи переживали перезавантаження сторінки під час ручного тестування.
Кнопка **Налаштування → «Скинути демо-дані»** (доступна лише `super_admin`) очищає це сховище
й повертає всі сутності до початкового seed-стану після наступного перезавантаження.

## Структура проєкту

```
app/
  (auth)/login/                 екран входу
  (auth)/no-access/             екран "немає доступу"
  (dashboard)/                  захищені маршрути (layout.tsx = auth-гейт + AppShell)
    calendar/ icons/ prayers/ saints/ gospel/ articles/ alphabet/
    church-info/ catalog/categories/ catalog/products/ orders/ media/ settings/ more/
  offline/                      офлайн-фолбек (прекешується service worker'ом)
  api/health/                   заглушка для Stage 2
  manifest.ts                   PWA manifest (Next.js Metadata API)
  sw.ts                         вихідний файл service worker (Serwist)
  providers.tsx                 QueryClientProvider + ThemeProvider + AuthProvider + Toaster

components/
  ui/        shadcn/ui примітиви (не редагувати вручну поверх генератора)
  layout/     AppShell, sidebar, bottom-nav, header, user-menu, guarded-link, require-access
  forms/      TextField/SelectField/NumberField/SwitchField/RelationPickerField/TranslationSwitcher
  feedback/   StateMessage, StatusBadge, ConfirmDialog, UnsavedChangesProvider
  media/, mobile/, desktop/  (зарезервовано для подальшої деталізації)

features/<domain>/    UI конкретного модуля (list-view, form, допоміжні редактори)

lib/
  api/
    client.ts          єдиний інтерфейс ApiClient (контракт між UI та даними)
    endpoints.ts        Stage 2 PLACEHOLDER-шляхи — НЕ підтверджені, перевірити перед Stage 2
    mock-adapter.ts     складання ApiClient з mock-ресурсів
    mock/               реалізація кожного ресурсу (calendar.ts, icons.ts, orders.ts, ...)
    http-adapter.ts      Stage 2 заглушка (кидає помилку, якщо викликати достроково)
    errors.ts, mock-utils.ts
  auth/       auth-context.tsx, permissions.ts, session.ts (mock, sessionStorage)
  i18n/       типізований словник інтерфейсу (uk — єдина локаль Stage 1)
  mock-data/  seed-дані для всіх сутностей
  pwa/        install-prompt / service-worker-update хуки
  validation/ Zod-схеми (одна на сутність)
  constants/  labels, navigation
  utils/

types/
  entities.ts   доменні типи (Language, ContentStatus, Role, усі сутності)
  api.ts        ApiError, пагінація, транспортні типи

e2e/            Playwright-специфікації
**/*.test.ts(x) Vitest unit-тести поруч із кодом
```

## Маршрути (Stage 1)

`/`, `/login`, `/no-access`, `/offline`, `/more`,
`/calendar`, `/calendar/new`, `/calendar/[id]`,
`/icons`, `/icons/new`, `/icons/[id]`,
`/prayers`, `/prayers/new`, `/prayers/[id]`,
`/saints`, `/saints/new`, `/saints/[id]`,
`/gospel`, `/gospel/new`, `/gospel/[id]`,
`/articles`, `/articles/new`, `/articles/[id]`,
`/alphabet`, `/alphabet/new`, `/alphabet/[id]`,
`/church-info` (singleton),
`/catalog/categories`, `/catalog/categories/new`, `/catalog/categories/[id]`,
`/catalog/products`, `/catalog/products/new`, `/catalog/products/[id]`,
`/orders`, `/orders/[id]` (без створення — беквенд цього не підтримує),
`/media`, `/settings`.

## Модель даних

Див. `types/entities.ts` — усі сутності типізовані там: `CalendarDay`, `Icon`, `Prayer`,
`Saint`, `GospelReading`, `Article`, `AlphabetLetter`, `ChurchInfo`, `ProductCategory`,
`Product`, `Order`, `MediaAsset`, `AuthUser`. Мовні поля контенту (`Language = "uk"|"ru"|"en"`)
не залежать від мови інтерфейсу (`lib/i18n`, наразі лише `uk`).

Сутності, що є "групами перекладів" (`translationGroupId` + `language`):
`CalendarDay`, `Icon`, `Saint`, `GospelReading`, `Article`, `AlphabetLetter`.
`Prayer` має власне поле `language`, але не входить у групу перекладів (за специфікацією).

## Ролі та права (`lib/auth/permissions.ts`)

| Роль | Контент | Каталог | Замовлення | Медіа | Налаштування |
|---|---|---|---|---|---|
| super_admin | edit | edit | edit | edit | edit |
| editor | edit | edit | view | edit | none |
| order_manager | none | edit | edit | edit | none |
| viewer | view | view | view | view | none |

## Що зроблено понад мінімум специфікації

- **Перемикач перекладів UK/RU/EN з індикатором заповненості** (готово/частково/порожньо)
  повністю реалізований для модуля **Ікони** (флагманський приклад). Той самий компонент
  (`components/forms/translation-switcher.tsx`) готовий для перевикористання в Saints/Gospel/
  Articles/Calendar — там ці модулі поки що використовують просте CRUD без перемикача
  (свідомий компроміс заради охоплення всіх 13 модулів у відведений час).
- **Обробка 409-конфліктів** на рівні мок-адаптера (`ensureUniqueSlug`) з прив'язкою помилки
  до конкретного поля форми (`applyApiFieldErrors`) — показано на Categories/Products.
- **Мок-дані персистентні в межах вкладки** (`sessionStorage`) — створені/відредаговані записи
  переживають перезавантаження сторінки, окремо від майбутніх production-даних.

## Свідомі спрощення Stage 1 (документовані компроміси)

- **Азбука**: реалізовано перевпорядкування "вгору/вниз" по групах перекладів замість
  HTML5 drag-and-drop — на дотикових екранах нативний DnD історично ненадійний;
  кнопки доступні й дотико-дружні. Справжній drag-and-drop можна додати пізніше без зміни API
  (`apiClient.alphabetLetters.reorderGroups`).
- **Календар**: мобільний редактор використовує ті самі 5 вкладок (Основне/Контент/Зв'язки/
  Медіа/Публікація), що й вимагає специфікація, але вкладки перемикаються вільно, а не як
  суворий лінійний wizard із примусовим порядком.
- **Медіа**: `mainImageId`/`imageId`/`coverImageId` у формах приймають ID з медіатеки текстовим
  полем (без візуального пікера) — обране свідоме спрощення, щоб встигнути охопити всі модулі;
  сама медіатека (завантаження, drag-and-drop, прогрес, валідація) реалізована повністю.
- **Замовлення**: без створення/видалення через UI (бекенд, за специфікацією, цього не
  підтримує) — тільки перегляд, зміна статусу, позначка "прочитано", внутрішня примітка.

## PWA

- `app/manifest.ts` — маніфест (іконки, standalone, theme-color).
- `app/sw.ts` — Serwist service worker: precache app shell, офлайн-фолбек на `/offline`,
  оновлення лише після підтвердження користувачем (`skipWaiting: false`, `clientsClaim: false`
  — див. коментар у файлі щодо гонки станів, яку це запобігає).
- Кнопка встановлення (`InstallPromptBanner`) і тост "Доступна нова версія" (`PwaUpdateListener`)
  змонтовані глобально в `app/layout.tsx`.
- Перевірено: `npm run build && npm run start`, встановлення works у Chrome desktop.

## Тестування

- **Vitest**: 30 тестів / 6 файлів — Zod-схеми, mock-adapter CRUD + 409-конфлікт, матриця прав,
  компоненти (`StatusBadge`, `TranslationSwitcher`).
- **Playwright**: 18 тестів (Chromium + Mobile Safari) — автентифікація (вхід/вихід/помилка/
  редирект), повний CRUD молитов із валідацією, адаптивна оболонка (sidebar/bottom-nav/тема).
- Під час написання e2e-тестів проти production-збірки було знайдено й виправлено **три реальні
  production-баги**, яких не було видно в dev-режимі:
  1. `clientsClaim: true` у service worker спричиняв перехоплення navigation fetch-запитів
     рівно в момент взяття контролю над уже відкритою сторінкою — це зрідка "з'їдало" клієнтський
     редирект одразу після входу. Виправлено (`clientsClaim: false`).
  2. Помилка входу з невірним паролем показувала загальне "сесія закінчилася" замість точного
     "невірний email або пароль" — `errorMessageFor` затирав специфічне повідомлення.
  3. `DropdownMenuLabel` у меню акаунта використовувався без обгортки `DropdownMenuGroup`
     (це вимагає бібліотека Base UI, на відміну від Radix) — клік по аватару валив усю сторінку
     в production-збірці. Виправлено обгортанням у `DropdownMenuGroup`.

Ці випадки — гарна ілюстрація того, чому в специфікації прямо вимагалися build/lint/typecheck
**і** тести: dev-режим (Turbopack вимкнено, SW вимкнено) приховував усі три проблеми.

## Перевірено вручну

- Ширина 375px (iPhone) та 1440px (desktop) — усі 13 модулів.
- Світла/темна тема, перемикання без збою гідратації.
- Нижня навігація (5 пунктів + "Ще") і bottom sheet з рештою розділів.
- Desktop sidebar зі згортанням, розділами, активним станом.
- Встановлення PWA на production build.

## Точки підключення Етапу 2 (Stage 2)

Нічого з наведеного нижче не виконано і не повинно виконуватися без окремого підтвердження.

1. **`lib/api/endpoints.ts`** — усі шляхи там позначені як PLACEHOLDER. Перед стартом Stage 2
   треба відкрити реальний роутер проєкту `svet-ikony` і звірити фактичні шляхи/параметри.
2. **`lib/api/http-adapter.ts`** — зараз кидає помилку при виклику. Це місце для реалізації
   `HttpApiAdapter`, що імплементує той самий інтерфейс `ApiClient` (`lib/api/client.ts`) —
   жоден компонент UI не повинен змінюватися при перемиканні адаптера.
3. **`lib/api/index.ts`** — точка перемикання (`getApiClient`). Додати прапорець
   `USE_REAL_API` і повертати `HttpApiAdapter` або залишений `mockApiAdapter` як fallback
   для локальної розробки.
4. **Автентифікація**: `lib/auth/session.ts` явно позначений як mock-рішення на
   `sessionStorage`. Stage 2 повністю замінює це на HttpOnly Secure SameSite cookie +
   BFF-маршрути в цьому ж admin-проєкті; жоден токен не повинен потрапляти в браузерний бандл.
5. **Медіа**: `lib/api/mock/media.ts` симулює завантаження через `URL.createObjectURL`.
   Stage 2 підключає реальний upload у R2/media endpoint; у D1/API зберігати лише URL і
   метадані. Не забути видалення EXIF-геолокації перед завантаженням.
6. **Церковна інформація**: форма явно попереджає про full-replace семантику. Перед
   збереженням у Stage 2 спершу зробити GET поточного запису, злити з формою, і лише тоді PUT.
7. **Ціни товарів**: відображаються "як є" з API, без прихованої конвертації копійок/гривень —
   зберегти цю поведінку і додати тести, якщо формат зміниться.
8. **Health-check, security headers (CSP/HSTS/X-Content-Type-Options/Referrer-Policy/
   Permissions-Policy/frame-ancestors), домен `admin.svetikony.com`, wrangler secret
   `ADMIN_JWT_SECRET`** — усе це з розділу "Перемикання production" специфікації, виконується
   тільки під час Stage 2 за окремою командою.

## Заборонено на цьому етапі (і не виконувалося)

Виклики production API, зміни в Cloudflare D1, зміни на сайті svetikony.com, зміни в Tauri-
адмінці, зміни Koyeb/Neon/Cloudflare Worker, production-секрети в репозиторії.
