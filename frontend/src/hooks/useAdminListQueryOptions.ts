import { useMemo } from 'react';

const DEFAULT_ADMIN_LIST_POLL_MS = 30000;

/**
 * Shared RTK Query options for admin list pages so data stays current
 * (new orders, services, returns, etc.) without a full browser refresh.
 */
export function useAdminListQueryOptions(pollingMs = DEFAULT_ADMIN_LIST_POLL_MS) {
  return useMemo(
    () => ({
      refetchOnFocus: true,
      refetchOnReconnect: true,
      refetchOnMountOrArgChange: true,
      pollingInterval: pollingMs,
    }),
    [pollingMs]
  );
}
