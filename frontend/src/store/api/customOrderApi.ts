import { baseApi } from './baseApi';
import type { CustomOrderStatus } from '../../../../shared/types';

export interface CustomOrder {
  _id: string;
  user: string;
  productName: string;
  description: string;
  quantity: number;
  estimatedPrice?: number;
  status: CustomOrderStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateCustomOrderRequest {
  productName: string;
  description: string;
  quantity: number;
  estimatedPrice?: number;
}

interface CustomOrdersResponse {
  customOrders: CustomOrder[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CustomOrdersQueryParams {
  page?: number;
  limit?: number;
  status?: CustomOrderStatus;
}

export const customOrderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createCustomOrder: builder.mutation<{ customOrder: CustomOrder }, CreateCustomOrderRequest>({
      query: (body) => ({
        url: '/custom-orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CustomOrder'],
    }),
    getCustomOrders: builder.query<CustomOrdersResponse, CustomOrdersQueryParams | void>({
      query: (params) => {
        if (!params) {
          return '/custom-orders';
        }
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.status) searchParams.append('status', params.status);

        return {
          url: `/custom-orders?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['CustomOrder'],
    }),
    getCustomOrder: builder.query<{ customOrder: CustomOrder }, string>({
      query: (id) => `/custom-orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'CustomOrder', id }],
    }),
    updateCustomOrder: builder.mutation<
      CustomOrder,
      { id: string; status?: CustomOrderStatus; estimatedPrice?: number; supplier?: string; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/custom-orders/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['CustomOrder', 'Admin'],
    }),
  }),
});

export const {
  useCreateCustomOrderMutation,
  useGetCustomOrdersQuery,
  useGetCustomOrderQuery,
  useUpdateCustomOrderMutation,
} = customOrderApi;
