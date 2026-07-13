import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create base query with error transformation
const baseQueryWithErrorHandling = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState, arg }) => {
    const state = getState() as RootState;
    const token = state.auth.token;

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    // Multipart uploads: never force application/json; browser must set boundary on FormData.
    const filesArg = arg as { files?: unknown[] } | undefined;
    const isMultipartFileUpload =
      Array.isArray(filesArg?.files) &&
      filesArg.files.length > 0 &&
      filesArg.files[0] instanceof File;
    if (isMultipartFileUpload) {
      headers.delete('Content-Type');
      return headers;
    }

    if (!headers.get('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  },
});

// Wrapper to transform errors
const baseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await baseQueryWithErrorHandling(args, api, extraOptions);
  
  // Transform error responses to include normalized structure
  if (result.error) {
    // Ensure error has status code
    if (!result.error.status && result.error.originalStatus) {
      result.error.status = result.error.originalStatus;
    }
    
    // Ensure error has data structure
    if (!result.error.data && result.error.error) {
      result.error.data = { message: result.error.error };
    }
  }
  
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
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
    'DeliveryLocation',
    'Garage',
    'ServiceProvider',
    'ServicePayout',
    'MediaAsset',
    'Coupon',
  ],
  endpoints: () => ({}),
});
