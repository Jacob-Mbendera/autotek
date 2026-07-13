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
      .concat(baseApi.middleware)
      .concat(rtkQueryCacheResetMiddleware),
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
