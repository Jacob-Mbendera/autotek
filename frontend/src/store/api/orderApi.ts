import { baseApi } from './baseApi';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../../../../shared/types';
import type { ProductImageField } from './productApi';
import {
  productIdFromOrderItem,
  productInvalidationTags,
} from './productInvalidation';
import { broadcastClientSync } from '../../utils/crossTabSync';
import {
  clearPendingPaychanguOrder,
  clearPaychanguRedirectAt,
  getPendingPaychanguOrder,
} from '../../utils/pendingPaychanguOrder';

export { productIdFromOrderItem, productInvalidationTags } from './productInvalidation';

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
  discount?: number;
  deliveryFee: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress: ShippingAddress | string;
  cancelReason?: string;
  paymentProofUrl?: string;
  paymentRejectionReason?: string;
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

interface CreateBankTransferOrderRequest extends CreateOrderRequest {
  proof: File;
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
      invalidatesTags: (_result, _error, arg) => [
        'Order',
        'Admin',
        ...productInvalidationTags(arg.items.map((item) => item.productId)),
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          broadcastClientSync('orders');
          broadcastClientSync('products');
        } catch {
          /* ignore */
        }
      },
    }),
    createBankTransferOrder: builder.mutation<
      { order: Order; token?: string; user?: any },
      CreateBankTransferOrderRequest
    >({
      query: ({ proof, ...data }) => {
        const formData = new FormData();
        formData.append('items', JSON.stringify(data.items));
        formData.append('shippingAddress', JSON.stringify(data.shippingAddress));
        if (data.guestInfo) formData.append('guestInfo', JSON.stringify(data.guestInfo));
        if (data.couponCode) formData.append('couponCode', data.couponCode);
        if (data.password) formData.append('password', data.password);
        formData.append('proof', proof);

        return {
          url: '/orders/bank-transfer',
          method: 'POST',
          body: formData,
          // Don't set Content-Type - browser will set it with boundary for FormData
          headers: {},
        };
      },
      invalidatesTags: (_result, _error, arg) => [
        'Order',
        'Admin',
        ...productInvalidationTags(arg.items.map((item) => item.productId)),
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          broadcastClientSync('orders');
          broadcastClientSync('products');
        } catch {
          /* ignore */
        }
      },
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
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          const { orderId: pendingId } = getPendingPaychanguOrder();
          if (pendingId && pendingId === arg.id) {
            clearPendingPaychanguOrder();
            clearPaychanguRedirectAt();
          }
          broadcastClientSync('orders');
          broadcastClientSync('products');
        } catch {
          /* ignore */
        }
      },
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useCreateBankTransferOrderMutation,
  useGetOrdersQuery,
  useGetOrderQuery,
  useCancelOrderMutation,
} = orderApi;
