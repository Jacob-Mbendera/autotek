import { baseApi } from './baseApi';
import type { PaymentMethod, PaymentStatus } from '../../../../shared/types';

export interface Payment {
  _id: string;
  order: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  reference?: string;
  paymentDetails?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface InitiatePaymentRequest {
  orderId?: string;
  towingServiceId?: string;
  carServiceId?: string;
  paymentMethod: PaymentMethod;
  phoneNumber?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

interface InitiatePaymentResponse {
  payment: Payment;
  paymentUrl?: string;
  redirectUrl?: string; // For PayChangu Standard Checkout
  paymentInstructions?: string;
  instructions?: string;
}

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    initiatePayment: builder.mutation<InitiatePaymentResponse, InitiatePaymentRequest>({
      query: (body) => ({
        url: '/payments/initiate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payment', 'Order', 'Admin'],
    }),
    getPayment: builder.query<{ payment: Payment }, string>({
      query: (id) => `/payments/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Payment', id }],
    }),
    getPaymentByOrder: builder.query<{ payment: Payment }, string>({
      query: (orderId) => `/payments/order/${orderId}`,
      providesTags: (_result, _error, orderId) => [{ type: 'Payment', id: orderId }],
    }),
    verifyPayment: builder.mutation<
      { payment: Payment; verified: boolean },
      { orderId?: string; txRef?: string; email?: string }
    >({
      query: ({ orderId, txRef, email }) => {
        const params = new URLSearchParams();
        if (orderId) params.set('orderId', orderId);
        if (txRef) params.set('tx_ref', txRef);
        if (email) params.set('email', email);
        return {
          url: `/payments/verify-txref?${params.toString()}`,
          method: 'GET',
        };
      },
      invalidatesTags: (_result, _error, { orderId }) => [
        ...(orderId ? [{ type: 'Payment' as const, id: orderId }] : []),
        'Payment',
        'Order',
        'Admin',
        'Product',
        { type: 'Product', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useInitiatePaymentMutation,
  useGetPaymentQuery,
  useGetPaymentByOrderQuery,
  useVerifyPaymentMutation,
} = paymentApi;
