"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";

/** Shared across every consumer -- TanStack Query dedupes concurrent
 * `useQuery` calls with an identical key into one request and one cache
 * entry, so the sidebar (and anything else that calls this hook) polls
 * together instead of each mounting its own independent interval. */
export const UNREAD_ORDERS_QUERY_KEY = ["orders", "unread-count"] as const;

const POLL_INTERVAL_MS = 30_000;

/**
 * Powers the sidebar's unread-order badge. `enabled: canView("orders")` --
 * a role that can't see the Orders nav item at all never issues the
 * request, so the count is never fetched for it either.
 *
 * Polling/refresh behavior all comes from TanStack Query's own defaults,
 * not custom wiring: `refetchInterval` polls every 30s while mounted,
 * `refetchIntervalInBackground` defaults to false so polling pauses while
 * the tab is hidden, and `refetchOnWindowFocus` (default true) is what
 * covers "refresh when the admin comes back" -- in this TanStack Query
 * version that's driven entirely by the `visibilitychange` event (see
 * query-core's focusManager), which is what actually fires when switching
 * back to this tab/window; there is no separate raw `focus` listener.
 *
 * No optimistic decrement: `refreshUnreadOrders` always invalidates and
 * refetches the real count from the backend, so a failed markRead can
 * never leave the badge showing a number lower than what's actually
 * unread.
 */
export function useUnreadOrders() {
  const { canView } = useAuth();
  const queryClient = useQueryClient();
  const enabled = canView("orders");

  const query = useQuery({
    queryKey: UNREAD_ORDERS_QUERY_KEY,
    queryFn: () => apiClient.orders.unreadCount(),
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
  });

  function refreshUnreadOrders() {
    return queryClient.invalidateQueries({ queryKey: UNREAD_ORDERS_QUERY_KEY });
  }

  return {
    count: enabled ? (query.data ?? 0) : 0,
    refreshUnreadOrders,
  };
}
