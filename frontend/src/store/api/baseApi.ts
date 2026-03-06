import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.token;

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      // Only set Content-Type if not already set (FormData will set it automatically)
      if (!headers.get('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return headers;
    },
  }),
  tagTypes: [
    'User',
    'Product',
    'Order',
    'CustomOrder',
    'TowingService',
    'CarService',
    'Payment',
    'Admin',
    'Wishlist',
    'Review',
    'Return',
  ],
  endpoints: () => ({}),
});
