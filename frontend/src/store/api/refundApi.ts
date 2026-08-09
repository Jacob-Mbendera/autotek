import { baseApi } from './baseApi';

export type RefundPaymentStatus = 'refund_pending' | 'refunded';

export interface AdminRefundPayment {
  _id: string;
  type: 'order' | 'towing' | 'car-service';
  amount: number;
  method: string;
  transactionId?: string;
  chargeId?: string;
  refundReason?: string;
  refundRequestedAt?: string;
  refundCompletedAt?: string;
  status: RefundPaymentStatus | string;
  createdAt: string;
  updatedAt: string;
  order?: {
    _id: string;
    totalAmount?: number;
    status?: string;
    paymentStatus?: string;
    createdAt?: string;
  } | string;
  towingService?: {
    _id: string;
    status?: string;
    paymentStatus?: string;
    price?: number;
    pickupLocation?: string;
    destination?: string;
  } | string;
  carService?: {
    _id: string;
    status?: string;
    paymentStatus?: string;
    price?: number;
    serviceTypes?: string[];
    address?: string;
  } | string;
}

export interface AdminRefundsResponse {
  refunds: AdminRefundPayment[];
  pendingCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const refundApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminRefunds: builder.query<
      AdminRefundsResponse,
      { page?: number; limit?: number; status?: string; search?: string }
    >({
      query: ({ page = 1, limit = 20, status, search } = {}) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (status) params.set('status', status);
        if (search) params.set('search', search);
        return `/admin/refunds?${params.toString()}`;
      },
      providesTags: ['AdminRefunds'],
    }),
    completeAdminRefund: builder.mutation<
      { payment: AdminRefundPayment; message: string },
      { id: string; notes?: string }
    >({
      query: ({ id, notes }) => ({
        url: `/admin/refunds/${id}/complete`,
        method: 'PATCH',
        body: notes ? { notes } : {},
      }),
      invalidatesTags: (result) => {
        const payment = result?.payment;
        const orderId = typeof payment?.order === 'string' ? payment.order : payment?.order?._id;
        const towingServiceId =
          typeof payment?.towingService === 'string' ? payment.towingService : payment?.towingService?._id;
        const carServiceId =
          typeof payment?.carService === 'string' ? payment.carService : payment?.carService?._id;

        return [
          'AdminRefunds',
          'Order',
          'Admin',
          'Payment',
          'TowingService',
          'CarService',
          ...(orderId ? [{ type: 'Order' as const, id: orderId }, { type: 'Admin' as const, id: orderId }, { type: 'Payment' as const, id: orderId }] : []),
          ...(towingServiceId ? [{ type: 'TowingService' as const, id: towingServiceId }] : []),
          ...(carServiceId ? [{ type: 'CarService' as const, id: carServiceId }] : []),
        ];
      },
    }),
  }),
});

export const { useGetAdminRefundsQuery, useCompleteAdminRefundMutation } = refundApi;
