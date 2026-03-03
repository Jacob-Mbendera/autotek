import { baseApi } from './baseApi';
import type { OrderStatus, CustomOrderStatus, ServiceStatus } from '../../../../shared/types';

export interface AdminStats {
  orders: {
    total: number;
    pending: number;
  };
  products: {
    total: number;
    outOfStock: number;
  };
  users: {
    total: number;
  };
  services: {
    towing: number;
    carService: number;
  };
  revenue: {
    total: number;
  };
  payments: {
    pending: number;
  };
}

interface GetAllOrdersQueryParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
}

interface GetAllCustomOrdersQueryParams {
  page?: number;
  limit?: number;
  status?: CustomOrderStatus;
  startDate?: string;
  endDate?: string;
}

interface GetAllServicesQueryParams {
  page?: number;
  limit?: number;
  status?: ServiceStatus;
  type?: 'towing' | 'car-service';
  startDate?: string;
  endDate?: string;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStats: builder.query<AdminStats, void>({
      query: () => '/admin/stats',
      providesTags: ['Admin'],
    }),
    getAllOrders: builder.query<
      { orders: unknown[]; pagination: unknown },
      GetAllOrdersQueryParams | void
    >({
      query: (params) => {
        if (!params) {
          return '/admin/orders';
        }
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.status) searchParams.append('status', params.status);
        if (params.startDate) searchParams.append('startDate', params.startDate);
        if (params.endDate) searchParams.append('endDate', params.endDate);

        return {
          url: `/admin/orders?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Admin'],
    }),
    getAllCustomOrders: builder.query<
      { customOrders: unknown[]; pagination: unknown },
      GetAllCustomOrdersQueryParams | void
    >({
      query: (params) => {
        if (!params) {
          return '/admin/custom-orders';
        }
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.status) searchParams.append('status', params.status);
        if (params.startDate) searchParams.append('startDate', params.startDate);
        if (params.endDate) searchParams.append('endDate', params.endDate);

        return {
          url: `/admin/custom-orders?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Admin'],
    }),
    getAllServices: builder.query<
      { services: unknown[]; pagination: unknown },
      GetAllServicesQueryParams | void
    >({
      query: (params) => {
        if (!params) {
          return '/admin/services';
        }
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.status) searchParams.append('status', params.status);
        if (params.type) searchParams.append('type', params.type);
        if (params.startDate) searchParams.append('startDate', params.startDate);
        if (params.endDate) searchParams.append('endDate', params.endDate);

        return {
          url: `/admin/services?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Admin'],
    }),
  }),
});

export const {
  useGetStatsQuery,
  useGetAllOrdersQuery,
  useGetAllCustomOrdersQuery,
  useGetAllServicesQuery,
} = adminApi;
