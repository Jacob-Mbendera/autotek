import { useEffect } from 'react';
import { useAppDispatch } from '../store/types';
import { setUser, logout } from '../store/slices/authSlice';
import { useGetMeQuery } from '../store/api/authApi';

/**
 * Auth now lives in an httpOnly cookie, not persisted Redux state, so on app
 * load there is nothing in the store to trust yet. This asks the server
 * (which trusts the cookie) who's logged in, if anyone, and populates the
 * store from that — the httpOnly-cookie equivalent of rehydrating from
 * localStorage.
 */
export function useAuthBootstrap(): void {
  const dispatch = useAppDispatch();
  const { data, isSuccess, isError } = useGetMeQuery();

  useEffect(() => {
    if (isSuccess && data?.user) {
      dispatch(setUser({ user: data.user }));
    } else if (isError) {
      dispatch(logout());
    }
  }, [isSuccess, isError, data, dispatch]);
}
