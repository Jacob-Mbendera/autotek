import { baseApi } from './baseApi';
import type { OrderStatus, CustomOrderStatus, ServiceStatus, UserRole } from '../../../../shared/types';
import type { Order } from './orderApi';

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
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface GetAllServicesQueryParams {
  page?: number;
  limit?: number;
  status?: ServiceStatus;
  type?: 'towing' | 'car-service';
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface GetAllUsersQueryParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  search?: string;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  address?: string;
  createdAt: string;
  updatedAt: string;
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
    getAdminOrder: builder.query<{ order: Order }, string>({
      query: (id) => `/admin/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Admin', id }],
    }),
    updateOrderStatus: builder.mutation<
      { order: unknown },
      { id: string; status: OrderStatus }
    >({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'Admin',
        { type: 'Admin', id },
        'Order',
      ],
    }),
    getCustomOrder: builder.query<{ customOrder: unknown }, string>({
      query: (id) => `/admin/custom-orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Admin', id }],
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
        if (params.search) searchParams.append('search', params.search);
        if (params.startDate) searchParams.append('startDate', params.startDate);
        if (params.endDate) searchParams.append('endDate', params.endDate);

        return {
          url: `/admin/services?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Admin'],
    }),
    getAllUsers: builder.query<
      { users: User[]; pagination: unknown },
      GetAllUsersQueryParams | void
    >({
      query: (params) => {
        if (!params) {
          return '/admin/users';
        }
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.role) searchParams.append('role', params.role);
        if (params.search) searchParams.append('search', params.search);

        return {
          url: `/admin/users?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Admin'],
    }),
    getUser: builder.query<{ user: User }, string>({
      query: (id) => `/admin/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Admin', id: `user-${id}` }],
    }),
    updateUserRole: builder.mutation<{ user: User }, { userId: string; role: UserRole }>({
      query: ({ userId, role }) => ({
        url: `/admin/users/${userId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        'Admin',
        { type: 'Admin', id: `user-${userId}` },
      ],
    }),
  }),
});

export const {
  useGetStatsQuery,
  useGetAllOrdersQuery,
  useGetAdminOrderQuery,
  useUpdateOrderStatusMutation,
  useGetCustomOrderQuery,
  useGetAllCustomOrdersQuery,
  useGetAllServicesQuery,
  useGetAllUsersQuery,
  useGetUserQuery,
  useUpdateUserRoleMutation,
} = adminApi;
