import type { AuthApi, AuthSession } from "@/lib/api/client";
import { BFF_ENDPOINTS } from "@/lib/api/endpoints";
import { httpGet, httpPost } from "@/lib/api/http/transport";
import { toApiError } from "@/lib/api/errors";

/**
 * Real production AuthApi (Phase 1B) -- talks ONLY to this admin's own
 * same-origin BFF routes (app/api/bff/auth/**), never to svet-ikony
 * directly; no secret and no session token is ever visible to this module,
 * the browser only ever sees an HttpOnly cookie it cannot itself read.
 *
 * getSession()'s null-vs-throw contract matters for AuthProvider
 * (lib/auth/auth-context.tsx): resolves to `null` when there was no
 * session cookie at all ("never logged in" -> status "unauthenticated"),
 * but *rethrows* when a cookie was presented and rejected as no-longer-
 * valid ("session_expired" -> status "expired", preserving the existing
 * "please log in again" UX). See app/api/bff/auth/session/route.ts's own
 * doc comment for why exposing that one distinction to the browser is
 * safe here (the caller already holds the cookie in question).
 */
export const authHttpResource: AuthApi = {
  async login(values) {
    return httpPost<AuthSession>(BFF_ENDPOINTS.auth.login, values);
  },

  async logout() {
    await httpPost<void>(BFF_ENDPOINTS.auth.logout, undefined);
  },

  async exchangeTelegramTicket(ticket) {
    return httpPost<AuthSession>(BFF_ENDPOINTS.auth.telegramExchange, { ticket });
  },

  async getSession() {
    try {
      return await httpGet<AuthSession>(BFF_ENDPOINTS.auth.session);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === "unauthorized" && apiError.message === "session_expired") {
        throw apiError;
      }
      return null;
    }
  },
};
