import type { AuthApi, AuthSession } from "@/lib/api/client";
import { mockDelay } from "@/lib/api/mock-utils";
import { clearMockSession, readMockSession, writeMockSession } from "@/lib/auth/session";
import { mockAccounts } from "@/lib/mock-data/users";
import { ApiError } from "@/types/api";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export const authResource: AuthApi = {
  async login(values) {
    await mockDelay(500);
    const account = mockAccounts.find(
      (a) => a.user.email.toLowerCase() === values.email.trim().toLowerCase(),
    );
    if (!account || account.password !== values.password) {
      throw new ApiError("unauthorized", "Невірний email або пароль");
    }
    const session: AuthSession = {
      user: account.user,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
    };
    writeMockSession(session);
    return session;
  },

  async logout() {
    await mockDelay(150);
    clearMockSession();
  },

  async getSession() {
    await mockDelay(80);
    return readMockSession();
  },

  // Phase 3: Telegram login has no meaningful mock simulation -- there is
  // no real Telegram bot to talk to in dev/test mock mode, and the
  // existing DevTestAccountsPanel + password path already covers dev
  // login. Throws rather than fabricating a fake success.
  async exchangeTelegramTicket() {
    await mockDelay(150);
    throw new ApiError("unknown", "Telegram login is not available in mock mode");
  },
};
