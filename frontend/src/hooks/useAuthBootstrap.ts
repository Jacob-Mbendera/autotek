import { useEffect } from 'react';
import { useAppDispatch } from '../store/types';
import { setUser, replaceAuthState } from '../store/slices/authSlice';
import { useGetMeQuery } from '../store/api/authApi';

/**
 * Auth now lives in an httpOnly cookie, not persisted Redux state, so on app
 * load there is nothing in the store to trust yet. This asks the server
 * (which trusts the cookie) who's logged in, if anyone, and populates the
 * store from that — the httpOnly-cookie equivalent of rehydrating from
 * localStorage.
 *
 * A guest with no cookie gets a 401 here on every single page load. That's
 * not a real logout, so it must not dispatch `logout()` — that action is
 * caught by rtkQueryCacheResetMiddleware and resets the entire RTK Query
 * cache, cancelling every other query that started fetching on the same
 * mount (e.g. the page's own data) before it can resolve, leaving those
 * components stuck on their initial loading state forever.
 */
export function useAuthBootstrap(): void {
  const dispatch = useAppDispatch();
  const { data, isSuccess, isError } = useGetMeQuery();

  useEffect(() => {
    if (isSuccess && data?.user) {
      dispatch(setUser({ user: data.user }));
    } else if (isError) {
      dispatch(replaceAuthState({ user: null, isAuthenticated: false }));
    }
  }, [isSuccess, isError, data, dispatch]);
}
