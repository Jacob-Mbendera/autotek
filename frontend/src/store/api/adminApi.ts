import { baseApi } from './baseApi';
import type { OrderStatus, CustomOrderStatus, ServiceStatus, UserRole } from '../../../../shared/types';
import type { Order } from './orderApi';
import { productIdFromOrderItem, productInvalidationTags } from './orderApi';
import { broadcastClientSync } from '../../utils/crossTabSync';

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

export interface AdminGarage {
  _id: string;
  name: string;
  contactPhone: string;
  email?: string;
  town: string;
  addressLine?: string;
  verificationStatus: string;
  notes?: string;
}
export interface AdminServiceProvider {
  _id: string;
  garage: AdminGarage | string;
  name: string;
  phone: string;
  whatsAppPhone?: string;
  providerType: 'driver' | 'mechanic';
  vettingStatus: string;
  active: boolean;
  certificationNote?: string;
  averageRating?: number;
  ratingCount?: number;
  activeAssignmentCount?: number;
}
export interface ServicePayoutRow {
  _id: string;
  amountMwk: number;
  status: string;
  serviceKind: string;
  service: string;
  garage: AdminGarage | string;
  provider?: AdminServiceProvider | string;
  paidAt?: string;
  createdAt: string;
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
      {
        _id?: string;
        status?: OrderStatus;
        items?: Order['items'];
        message?: string;
        refundPending?: boolean;
        refundProcessed?: boolean;
        refundMessage?: string;
        cancelReason?: string;
      },
      { id: string; status: OrderStatus; cancelReason?: string }
    >({
      query: ({ id, status, cancelReason }) => {
        const body: { status: OrderStatus; cancelReason?: string } = { status };
        if (status === 'cancelled') {
          body.cancelReason = cancelReason ?? '';
        }
        return {
          url: `/orders/${id}/status`,
          method: 'PUT',
          body,
        };
      },
      invalidatesTags: (result, _error, { id, status }) => {
        const tags: Array<
          | 'Admin'
          | 'Order'
          | 'Product'
          | { type: 'Admin' | 'Order' | 'Product'; id: string }
        > = [
          'Admin',
          { type: 'Admin', id },
          'Order',
          { type: 'Order', id },
        ];

        if (status === 'cancelled' || result?.status === 'cancelled') {
          const productIds =
            result?.items
              ?.map((item) => productIdFromOrderItem(item))
              .filter((productId): productId is string => Boolean(productId)) ?? [];
          tags.push('Product', ...productInvalidationTags(productIds));
        }

        return tags;
      },
      async onQueryStarted({ status }, { queryFulfilled }) {
        try {
          await queryFulfilled;
          if (status === 'cancelled') {
            broadcastClientSync('orders');
            broadcastClientSync('products');
          }
        } catch {
          /* ignore */
        }
      },
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
    getGarages: builder.query<
      { garages: AdminGarage[]; pagination: unknown },
      { page?: number; limit?: number; search?: string } | void
    >({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params?.page) sp.append('page', String(params.page));
        if (params?.limit) sp.append('limit', String(params.limit));
        if (params?.search) sp.append('search', params.search);
        const q = sp.toString();
        return `/admin/garages${q ? `?${q}` : ''}`;
      },
      providesTags: ['Garage'],
    }),
    createGarage: builder.mutation<AdminGarage, Partial<AdminGarage> & { name: string; contactPhone: string; town: string }>({
      query: (body) => ({ url: '/admin/garages', method: 'POST', body }),
      invalidatesTags: ['Garage', 'Admin'],
    }),
    updateGarage: builder.mutation<AdminGarage, { id: string; body: Partial<AdminGarage> }>({
      query: ({ id, body }) => ({ url: `/admin/garages/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Garage', 'Admin'],
    }),
    getServiceProviders: builder.query<
      { providers: AdminServiceProvider[]; pagination: unknown },
      {
        page?: number;
        limit?: number;
        search?: string;
        providerType?: 'driver' | 'mechanic';
        vettingStatus?: string;
        garageId?: string;
        includeWorkload?: boolean;
      } | void
    >({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params?.page) sp.append('page', String(params.page));
        if (params?.limit) sp.append('limit', String(params.limit));
        if (params?.search) sp.append('search', params.search);
        if (params?.providerType) sp.append('providerType', params.providerType);
        if (params?.vettingStatus) sp.append('vettingStatus', params.vettingStatus);
        if (params?.garageId) sp.append('garageId', params.garageId);
        if (params?.includeWorkload) sp.append('includeWorkload', 'true');
        const q = sp.toString();
        return `/admin/service-providers${q ? `?${q}` : ''}`;
      },
      providesTags: ['ServiceProvider'],
    }),
    getProvidersForAssignment: builder.query<
      { providers: AdminServiceProvider[] },
      { providerType: 'driver' | 'mechanic' }
    >({
      query: ({ providerType }) => `/admin/service-providers/for-assignment?providerType=${providerType}`,
      providesTags: ['ServiceProvider'],
    }),
    createServiceProvider: builder.mutation<
      AdminServiceProvider,
      {
        garage: string;
        name: string;
        phone: string;
        providerType: 'driver' | 'mechanic';
        whatsAppPhone?: string;
        vettingStatus?: string;
        active?: boolean;
        certificationNote?: string;
      }
    >({
      query: (body) => ({ url: '/admin/service-providers', method: 'POST', body }),
      invalidatesTags: ['ServiceProvider', 'Admin'],
    }),
    updateServiceProvider: builder.mutation<AdminServiceProvider, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/admin/service-providers/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['ServiceProvider', 'Admin'],
    }),
    getServicePayouts: builder.query<
      { payouts: ServicePayoutRow[]; pagination: unknown },
      { page?: number; limit?: number; status?: string } | void
    >({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params?.page) sp.append('page', String(params.page));
        if (params?.limit) sp.append('limit', String(params.limit));
        if (params?.status) sp.append('status', params.status);
        const q = sp.toString();
        return `/admin/service-payouts${q ? `?${q}` : ''}`;
      },
      providesTags: ['ServicePayout'],
    }),
    markServicePayoutPaid: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/admin/service-payouts/${id}/mark-paid`, method: 'PATCH' }),
      invalidatesTags: ['ServicePayout', 'Admin'],
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
  useGetGaragesQuery,
  useCreateGarageMutation,
  useUpdateGarageMutation,
  useGetServiceProvidersQuery,
  useGetProvidersForAssignmentQuery,
  useCreateServiceProviderMutation,
  useUpdateServiceProviderMutation,
  useGetServicePayoutsQuery,
  useMarkServicePayoutPaidMutation,
} = adminApi;
