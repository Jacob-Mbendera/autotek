import { baseApi } from './baseApi';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../../../../shared/types';
import type { ProductImageField } from './productApi';

export interface OrderItem {
  product: {
    _id: string;
    name: string;
    images: ProductImageField[];
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

function productIdFromOrderItem(item: {
  product: OrderItem['product'] | string | null | undefined;
}): string | null {
  const { product } = item;
  if (!product) return null;
  if (typeof product === 'string') return product;
  if (typeof product === 'object' && '_id' in product && product._id) {
    return product._id;
  }
  return null;
}

function productInvalidationTags(productIds: string[]) {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  return [
    { type: 'Product' as const, id: 'LIST' },
    ...uniqueIds.map((id) => ({ type: 'Product' as const, id })),
  ];
}

export const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation<{ order: Order; token?: string; user?: any }, CreateOrderRequest>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        'Order',
        'Admin',
        ...productInvalidationTags(arg.items.map((item) => item.productId)),
      ],
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
      invalidatesTags: (result, _error, { id }) => {
        const productIds =
          result?.order?.items
            ?.map((item) => productIdFromOrderItem(item))
            .filter((productId): productId is string => Boolean(productId)) ?? [];
        return [
          { type: 'Order', id },
          'Order',
          'Admin',
          ...productInvalidationTags(productIds),
        ];
      },
    }),
  }),
});

export const { useCreateOrderMutation, useGetOrdersQuery, useGetOrderQuery, useCancelOrderMutation } = orderApi;
