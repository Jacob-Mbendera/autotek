import { configureStore, combineReducers } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import authReducer, { logout } from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import productReducer from './slices/productSlice';
import wishlistReducer from './slices/wishlistSlice';
import comparisonReducer from './slices/comparisonSlice';
import orderReducer from './slices/orderSlice';
import serviceReducer from './slices/serviceSlice';
import uiReducer from './slices/uiSlice';
import adminReducer from './slices/adminSlice';
import { baseApi } from './api/baseApi';
import './api/registerApis';

const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  product: productReducer,
  wishlist: wishlistReducer,
  comparison: comparisonReducer,
  order: orderReducer,
  service: serviceReducer,
  ui: uiReducer,
  admin: adminReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'cart', 'comparison'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// RTK Query can throw when tag invalidation runs for an unregistered endpoint (e.g. HMR).
// Swallow that specific failure so callers still receive the real API error (e.g. 400),
// then force Return tag invalidation so list UIs do not stay stale.
const safeRtkQueryMiddleware: Middleware = (api) => {
  const rtkHandler = baseApi.middleware(api);
  return (next) => (action) => {
    try {
      return rtkHandler(next)(action);
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.includes('invalidatesTags')
      ) {
        const result = next(action);
        api.dispatch(
          baseApi.util.invalidateTags([
            'Return',
            { type: 'Return', id: 'LIST' },
          ])
        );
        return result;
      }
      throw error;
    }
  };
};

// Middleware to reset RTK Query cache on logout
const rtkQueryCacheResetMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  if (logout.match(action)) {
    store.dispatch(baseApi.util.resetApiState());
  }
  return result;
};

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(safeRtkQueryMiddleware)
      .concat(rtkQueryCacheResetMiddleware),
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
