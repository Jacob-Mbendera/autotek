import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/types';
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
 * Keeps cart, compare (redux-persist), auth, and wishlist/orders (RTK Query)
 * in sync across browser tabs.
 *
 * Auth is not read out of localStorage — the session lives in an httpOnly
 * cookie, which the browser already shares across tabs on its own. What tabs
 * need from each other is just the *signal* that login/logout happened, so
 * each tab's own getMe query (see useAuthBootstrap) can refetch and pick up
 * the shared cookie's current state — see the 'auth' scope below.
 */
export function useCrossTabSync(): void {
  const dispatch = useAppDispatch();
  const lastPersistFingerprintRef = useRef<string>('');

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
      if (scope === 'auth') {
        dispatch(baseApi.util.invalidateTags(['User', 'Wishlist', 'Order', 'Cart']));
      }
      if (scope === 'cart') {
        dispatch(baseApi.util.invalidateTags(['Cart']));
      }
    };

    const applyPersistSlices = (raw: string | null) => {
      if (!raw || raw === lastPersistFingerprintRef.current) {
        return;
      }

      const parsed = parsePersistRoot(raw);
      if (!parsed) return;

      lastPersistFingerprintRef.current = raw;

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
