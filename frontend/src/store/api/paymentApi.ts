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
  orderId: string;
  paymentMethod: PaymentMethod;
  phoneNumber?: string;
}

interface InitiatePaymentResponse {
  payment: Payment;
  paymentUrl?: string;
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
      invalidatesTags: ['Payment'],
    }),
    getPayment: builder.query<{ payment: Payment }, string>({
      query: (id) => `/payments/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Payment', id }],
    }),
    verifyPayment: builder.mutation<{ payment: Payment; verified: boolean }, string>({
      query: (id) => ({
        url: `/payments/verify`,
        method: 'POST',
        body: { paymentId: id },
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Payment', id }],
    }),
  }),
});

export const { useInitiatePaymentMutation, useGetPaymentQuery, useVerifyPaymentMutation } =
  paymentApi;
