import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/types';
import { logout, replaceAuthState, type User } from '../store/slices/authSlice';
import { replaceCartState, type CartState } from '../store/slices/cartSlice';
import { replaceComparisonState } from '../store/slices/comparisonSlice';
import { baseApi } from '../store/api/baseApi';
import {
  broadcastClientSync,
  parsePersistRoot,
  PERSIST_ROOT_KEY,
  subscribeClientSync,
  type ClientSyncScope,
} from '../utils/crossTabSync';

/**
 * Keeps cart, auth, compare (redux-persist) and wishlist/orders (RTK Query)
 * in sync across browser tabs.
 */
export function useCrossTabSync(): void {
  const dispatch = useAppDispatch();
  const currentToken = useAppSelector((state) => state.auth.token);
  const lastPersistFingerprintRef = useRef<string>('');
  const lastTokenRef = useRef<string | null>(currentToken);

  useEffect(() => {
    lastTokenRef.current = currentToken;
  }, [currentToken]);

  useEffect(() => {
    const invalidateScope = (scope: ClientSyncScope) => {
      if (scope === 'wishlist') {
        dispatch(baseApi.util.invalidateTags(['Wishlist']));
      }
      if (scope === 'orders') {
        dispatch(baseApi.util.invalidateTags(['Order']));
      }
      if (scope === 'products') {
        dispatch(baseApi.util.invalidateTags(['Product']));
      }
    };

    const applyPersistSlices = (raw: string | null) => {
      if (!raw || raw === lastPersistFingerprintRef.current) {
        return;
      }

      const parsed = parsePersistRoot(raw);
      if (!parsed) return;

      lastPersistFingerprintRef.current = raw;

      const inboundAuth = parsed.auth;
      const inboundToken = inboundAuth?.token ?? null;
      const wasLoggedIn = Boolean(lastTokenRef.current);
      const isLoggedIn = Boolean(inboundToken);

      if (wasLoggedIn && !isLoggedIn) {
        dispatch(logout());
      } else if (inboundAuth) {
        dispatch(
          replaceAuthState({
            user: (inboundAuth.user as User | null) ?? null,
            token: inboundToken,
            isAuthenticated: Boolean(inboundToken) && inboundAuth.isAuthenticated,
          })
        );

        if (!wasLoggedIn && isLoggedIn) {
          dispatch(baseApi.util.invalidateTags(['Wishlist', 'Order']));
        }
      }

      if (parsed.cart) {
        dispatch(replaceCartState(parsed.cart as CartState));
      }

      if (parsed.comparison) {
        dispatch(
          replaceComparisonState({
            products: parsed.comparison.products as Parameters<
              typeof replaceComparisonState
            >[0]['products'],
            maxProducts: parsed.comparison.maxProducts,
          })
        );
      }

      lastTokenRef.current = inboundToken;
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === PERSIST_ROOT_KEY) {
        applyPersistSlices(event.newValue);
      }
    };

    const unsubscribeClientSync = subscribeClientSync(invalidateScope);

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      unsubscribeClientSync();
    };
  }, [dispatch]);
}

export { broadcastClientSync };
