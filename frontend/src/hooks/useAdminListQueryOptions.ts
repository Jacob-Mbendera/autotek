import { useMemo } from 'react';

const DEFAULT_ADMIN_LIST_POLL_MS = 30000;

/**
 * Shared RTK Query options for admin list pages so data stays current
 * (new orders, services, returns, etc.) without a full browser refresh.
 *
 * Pass `paused: true` while a background refetch could clobber in-progress
 * edits (e.g. an edit modal open over a row from this list) — this disables
 * polling and the focus/reconnect refetches without dropping the query.
 */
export function useAdminListQueryOptions(pollingMs = DEFAULT_ADMIN_LIST_POLL_MS, paused = false) {
  return useMemo(
    () => ({
      refetchOnFocus: !paused,
      refetchOnReconnect: !paused,
      refetchOnMountOrArgChange: true,
      pollingInterval: paused ? 0 : pollingMs,
    }),
    [pollingMs, paused]
  );
}
