/**
 * REST path map for HttpApiAdapter (Stage 2).
 *
 * These paths are PLACEHOLDERS based on the entity names in this admin's
 * spec — they have not been confirmed against the real svet-ikony API.
 * Stage 2 must read the actual router in the svet-ikony project and correct
 * this file before HttpApiAdapter is implemented. Do not assume these are
 * correct; do not call them from Stage 1 code.
 */
export const ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    session: "/api/auth/session",
  },
  calendarDays: "/api/calendar-days",
  icons: "/api/icons",
  prayers: "/api/prayers",
  saints: "/api/saints",
  gospelReadings: "/api/gospel",
  articles: "/api/articles",
  alphabetLetters: "/api/alphabet",
  churchInfo: "/api/church-info",
  categories: "/api/categories",
  products: "/api/products",
  orders: "/api/icon-orders",
  media: "/api/media",
  health: "/api/health",
} as const;
