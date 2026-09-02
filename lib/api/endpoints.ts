/**
 * REST path map for HttpApiAdapter (Stage 2).
 *
 * Two distinct kinds of path live here:
 *  - `UPSTREAM.*`: real svet-ikony Worker routes. These require a Bearer
 *    admin JWT and must ONLY ever be called from this admin's own
 *    server-side BFF route handlers (app/api/bff/**), never fetched
 *    directly from client code — that would leak the token into the
 *    browser bundle.
 *  - `BFF.*`: this admin's own same-origin proxy routes. Safe to call from
 *    client-side HttpApiAdapter code; no secret is involved on this side.
 *
 * Only `alphabetLetters`, `prayers`, and `media` have been verified against
 * the real svet-ikony API so far (Stage 2 READ modules + Stage 2D media
 * upload/delete — confirmed via local curl with a test JWT). Every other
 * UPSTREAM path below is still a PLACEHOLDER inherited from the original
 * spec naming — do not assume it is correct, and do not wire a resource to
 * it until it has been verified the same way alphabet/prayers/media were
 * (read the real route.ts, curl it locally).
 */
export const UPSTREAM_ENDPOINTS = {
  alphabetLetters: "/api/admin/church-content/alphabet", // ✅ verified
  prayers: "/api/admin/church-content/prayers", // ✅ verified (Stage 2I, full CRUD)
  calendarDays: "/api/admin/church-content/calendar-days", // ✅ verified (Stage 2H, full CRUD)
  categories: "/api/admin/church-content/product-categories", // ✅ verified (Stage 2J, full CRUD)
  products: "/api/admin/church-content/products", // ✅ verified (Stage 2J, full CRUD)
  icons: "/api/admin/church-content/icons", // ✅ verified (Stage 2K, full CRUD)
  saints: "/api/admin/church-content/saints", // ✅ verified (Stage 2L, full CRUD)
  media: {
    upload: "/api/admin/media/upload", // ✅ verified (Stage 2D)
    delete: "/api/admin/media", // ✅ verified (Stage 2D)
    list: "/api/admin/media", // ✅ verified (Telegram media picker stage) — GET on the same path DELETE uses
  },
  telegram: {
    status: "/api/admin/telegram/status", // ✅ verified
    users: "/api/admin/telegram/users", // ✅ verified
    chats: "/api/admin/telegram/chats", // ✅ verified
    today: "/api/admin/telegram/today", // ✅ verified
    posts: "/api/admin/telegram/posts", // ✅ verified (list + create); `${posts}/:id` and `${posts}/:id/publish` built at call sites
    autopostSettings: "/api/admin/telegram/autopost/settings", // ✅ verified (GET + PUT)
    contentPlan: "/api/admin/telegram/content-plan", // ✅ verified (GET, ?year= or ?from=&to=); `${contentPlan}/:date` built at call sites
  },

  // Not yet verified/wired for this admin — placeholders only:
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    session: "/api/auth/session",
  },
  gospelReadings: "/api/gospel",
  articles: "/api/articles",
  churchInfo: "/api/church-info",
  orders: "/api/icon-orders",
  health: "/api/health",
} as const;

/** This admin's own server-side proxy routes (see app/api/bff/**). */
export const BFF_ENDPOINTS = {
  alphabetLetters: "/api/bff/alphabet", // ✅ implemented (list + get only)
  prayers: "/api/bff/prayers", // ✅ implemented (Stage 2I, full CRUD)
  calendarDays: "/api/bff/calendar-days", // ✅ implemented (Stage 2H, full CRUD)
  categories: "/api/bff/product-categories", // ✅ implemented (Stage 2J, full CRUD)
  products: "/api/bff/products", // ✅ implemented (Stage 2J, full CRUD)
  icons: "/api/bff/icons", // ✅ implemented (Stage 2K, full CRUD)
  saints: "/api/bff/saints", // ✅ implemented (Stage 2L, full CRUD)
  mediaUpload: "/api/bff/media/upload", // ✅ implemented (Stage 2D)
  media: "/api/bff/media", // ✅ implemented — GET (list) + DELETE
  telegram: {
    status: "/api/bff/telegram/status",
    users: "/api/bff/telegram/users",
    chats: "/api/bff/telegram/chats",
    today: "/api/bff/telegram/today",
    posts: "/api/bff/telegram/posts", // `${posts}/:id` and `${posts}/:id/publish` built at call sites
    autopostSettings: "/api/bff/telegram/autopost/settings",
    contentPlan: "/api/bff/telegram/content-plan", // `${contentPlan}/:date` built at call sites
  },
} as const;
