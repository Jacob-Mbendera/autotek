import { baseApi } from './baseApi';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../../../../shared/types';

export interface OrderItem {
  product: {
    _id: string;
    name: string;
    images: string[];
  } | null;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  town?: string;
  landmark?: string;
  customAddress?: string;
  legacyAddress?: string;
}

export interface Order {
  _id: string;
  user?: string;
  guestInfo?: {
    email: string;
    name: string;
    phone: string;
  };
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress: ShippingAddress | string;
  createdAt: string;
  updatedAt: string;
}

interface CreateOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: ShippingAddress | string;
  paymentMethod?: PaymentMethod;
  guestInfo?: {
    email: string;
    name: string;
    phone: string;
  };
  couponCode?: string;
  password?: string;
}

interface OrdersResponse {
  orders: Order[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface OrdersQueryParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation<{ order: Order; token?: string; user?: any }, CreateOrderRequest>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order'],
    }),
    getOrders: builder.query<OrdersResponse, OrdersQueryParams | void>({
      query: (params) => {
        if (!params) {
          return '/orders';
        }
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.status) searchParams.append('status', params.status);

        return {
          url: `/orders?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Order'],
    }),
    getOrder: builder.query<{ order: Order }, { id: string; email?: string }>({
      query: ({ id, email }) => {
        const params = email ? `?email=${encodeURIComponent(email)}` : '';
        return `/orders/${id}${params}`;
      },
      providesTags: (_result, _error, { id }) => [{ type: 'Order', id }],
    }),
    cancelOrder: builder.mutation<{ order: Order; message: string }, { id: string; email?: string }>({
      query: ({ id, email }) => {
        const params = email ? `?email=${encodeURIComponent(email)}` : '';
        return {
          url: `/orders/${id}/cancel${params}`,
          method: 'PUT',
        };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Order', id }, 'Order'],
    }),
  }),
});

export const { useCreateOrderMutation, useGetOrdersQuery, useGetOrderQuery, useCancelOrderMutation } = orderApi;
