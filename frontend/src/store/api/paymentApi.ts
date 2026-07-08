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
    verifyPayment: builder.mutation<{ payment: Payment; verified: boolean }, string>({
      query: (id) => ({
        url: `/payments/verify`,
        method: 'POST',
        body: { paymentId: id },
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Payment', id },
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
